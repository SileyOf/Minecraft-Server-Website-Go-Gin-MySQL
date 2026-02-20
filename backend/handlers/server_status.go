package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"sync"
	"time"

	"hxzd-server/config"
	"hxzd-server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ========== mcsrvstat.us API 返回结构 ==========

type McsrvstatResponse struct {
	Online   bool   `json:"online"`
	IP       string `json:"ip"`
	Port     int    `json:"port"`
	Version  string `json:"version"`
	Software string `json:"software"`
	Motd     struct {
		Raw   []string `json:"raw"`
		Clean []string `json:"clean"`
		HTML  []string `json:"html"`
	} `json:"motd"`
	Players struct {
		Online int `json:"online"`
		Max    int `json:"max"`
		List   []struct {
			Name string `json:"name"`
			UUID string `json:"uuid"`
		} `json:"list"`
	} `json:"players"`
	Icon     string `json:"icon"`
	Protocol struct {
		Version int    `json:"version"`
		Name    string `json:"name"`
	} `json:"protocol"`
}

// ========== 缓存的服务器状态 ==========

type ServerStatusData struct {
	ServerID   uint   `json:"server_id"`
	ServerName string `json:"server_name"`
	Address    string `json:"address"`
	Online     bool   `json:"online"`
	Version    string `json:"version"`
	ServerType string `json:"server_type"`
	MOTD       string `json:"motd"`
	MOTDHTML   string `json:"motd_html"`
	Players    struct {
		Online int `json:"online"`
		Max    int `json:"max"`
		List   []struct {
			Name string `json:"name"`
			UUID string `json:"uuid"`
		} `json:"list,omitempty"`
	} `json:"players"`
	Icon     string `json:"icon,omitempty"`
	Software string `json:"software,omitempty"`
}

type ServerStatusHandler struct {
	DB    *gorm.DB
	Cfg   *config.Config
	cache []ServerStatusData
	mu    sync.RWMutex
}

func NewServerStatusHandler(db *gorm.DB, cfg *config.Config) *ServerStatusHandler {
	h := &ServerStatusHandler{
		DB:    db,
		Cfg:   cfg,
		cache: []ServerStatusData{},
	}
	go h.pollLoop()
	return h
}

func (h *ServerStatusHandler) pollLoop() {
	h.refreshAll()
	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		h.refreshAll()
	}
}

func (h *ServerStatusHandler) refreshAll() {
	var servers []models.GameServer
	h.DB.Where("enabled = ?", true).Order("sort_order ASC, id ASC").Find(&servers)

	if len(servers) == 0 {
		h.mu.Lock()
		h.cache = []ServerStatusData{}
		h.mu.Unlock()
		return
	}

	results := make([]ServerStatusData, len(servers))
	var wg sync.WaitGroup

	for i, srv := range servers {
		wg.Add(1)
		go func(idx int, s models.GameServer) {
			defer wg.Done()
			data := queryMcsrvstat(s)
			results[idx] = data
		}(i, srv)
	}

	wg.Wait()

	h.mu.Lock()
	h.cache = results
	h.mu.Unlock()
}

func queryMcsrvstat(srv models.GameServer) ServerStatusData {
	result := ServerStatusData{
		ServerID:   srv.ID,
		ServerName: srv.Name,
		Address:    srv.Address,
		ServerType: srv.ServerType,
		Online:     false,
	}

	url := fmt.Sprintf("https://api.mcsrvstat.us/3/%s", srv.Address)
	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		log.Printf("[mcsrvstat] request error for %s: %v", srv.Address, err)
		return result
	}
	req.Header.Set("User-Agent", "HXZD-Minecraft-Server-Website/1.0")

	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[mcsrvstat] fetch error for %s: %v", srv.Address, err)
		return result
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("[mcsrvstat] read error for %s: %v", srv.Address, err)
		return result
	}

	var apiResp McsrvstatResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		log.Printf("[mcsrvstat] parse error for %s: %v", srv.Address, err)
		return result
	}

	result.Online = apiResp.Online
	if !apiResp.Online {
		return result
	}

	result.Version = apiResp.Version
	result.Software = apiResp.Software
	result.Icon = apiResp.Icon
	result.Players.Online = apiResp.Players.Online
	result.Players.Max = apiResp.Players.Max

	if apiResp.Players.List != nil {
		for _, p := range apiResp.Players.List {
			result.Players.List = append(result.Players.List, struct {
				Name string `json:"name"`
				UUID string `json:"uuid"`
			}{Name: p.Name, UUID: p.UUID})
		}
	}

	if len(apiResp.Motd.Clean) > 0 {
		result.MOTD = ""
		for i, line := range apiResp.Motd.Clean {
			if i > 0 {
				result.MOTD += " "
			}
			result.MOTD += line
		}
	}
	if len(apiResp.Motd.HTML) > 0 {
		result.MOTDHTML = ""
		for i, line := range apiResp.Motd.HTML {
			if i > 0 {
				result.MOTDHTML += "<br>"
			}
			result.MOTDHTML += line
		}
	}

	return result
}

// ========== API Handlers ==========

// GetAllStatus 返回所有服务器状态（公开）
func (h *ServerStatusHandler) GetAllStatus(c *gin.Context) {
	h.mu.RLock()
	data := h.cache
	h.mu.RUnlock()

	totalOnline := 0
	totalMax := 0
	for _, s := range data {
		if s.Online {
			totalOnline += s.Players.Online
			totalMax += s.Players.Max
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"servers":      data,
		"total_online": totalOnline,
		"total_max":    totalMax,
	})
}

// GetStatus 兼容旧接口
func (h *ServerStatusHandler) GetStatus(c *gin.Context) {
	h.mu.RLock()
	data := h.cache
	h.mu.RUnlock()

	if len(data) == 0 {
		c.JSON(http.StatusOK, gin.H{"online": false})
		return
	}
	c.JSON(http.StatusOK, data[0])
}

// ========== GameServer CRUD (Admin) ==========

func (h *ServerStatusHandler) ListServers(c *gin.Context) {
	var servers []models.GameServer
	h.DB.Order("sort_order ASC, id ASC").Find(&servers)
	c.JSON(http.StatusOK, servers)
}

func (h *ServerStatusHandler) CreateServer(c *gin.Context) {
	var req struct {
		Name       string `json:"name" binding:"required"`
		Address    string `json:"address" binding:"required"`
		ServerType string `json:"server_type"`
		SortOrder  int    `json:"sort_order"`
		Enabled    bool   `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	srv := models.GameServer{
		Name:       req.Name,
		Address:    req.Address,
		ServerType: req.ServerType,
		SortOrder:  req.SortOrder,
		Enabled:    req.Enabled,
	}
	h.DB.Create(&srv)
	go h.refreshAll()
	c.JSON(http.StatusOK, srv)
}

func (h *ServerStatusHandler) UpdateServer(c *gin.Context) {
	id := c.Param("id")
	var srv models.GameServer
	if err := h.DB.First(&srv, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "服务器不存在"})
		return
	}

	var req struct {
		Name       *string `json:"name"`
		Address    *string `json:"address"`
		ServerType *string `json:"server_type"`
		SortOrder  *int    `json:"sort_order"`
		Enabled    *bool   `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	updates := map[string]interface{}{}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Address != nil {
		updates["address"] = *req.Address
	}
	if req.ServerType != nil {
		updates["server_type"] = *req.ServerType
	}
	if req.SortOrder != nil {
		updates["sort_order"] = *req.SortOrder
	}
	if req.Enabled != nil {
		updates["enabled"] = *req.Enabled
	}

	h.DB.Model(&srv).Updates(updates)
	go h.refreshAll()
	h.DB.First(&srv, id)
	c.JSON(http.StatusOK, srv)
}

func (h *ServerStatusHandler) DeleteServer(c *gin.Context) {
	id := c.Param("id")
	if err := h.DB.Delete(&models.GameServer{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除失败"})
		return
	}
	go h.refreshAll()
	c.JSON(http.StatusOK, gin.H{"message": "已删除"})
}

// ========== Embed/Config ==========

func (h *ServerStatusHandler) GetConfig(c *gin.Context) {
	var cfg models.ServerStatusConfig
	h.DB.First(&cfg)
	c.JSON(http.StatusOK, cfg)
}

func (h *ServerStatusHandler) UpdateConfig(c *gin.Context) {
	var req struct {
		MCServerAddress string `json:"mc_server_address"`
		MCServerPort    int    `json:"mc_server_port"`
		EmbedURL        string `json:"embed_url"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	var cfg models.ServerStatusConfig
	h.DB.First(&cfg)
	updates := map[string]interface{}{}
	if req.MCServerAddress != "" {
		updates["mc_server_address"] = req.MCServerAddress
	}
	if req.MCServerPort > 0 {
		updates["mc_server_port"] = req.MCServerPort
	}
	updates["embed_url"] = req.EmbedURL
	h.DB.Model(&cfg).Updates(updates)
	h.DB.First(&cfg)
	c.JSON(http.StatusOK, cfg)
}

func (h *ServerStatusHandler) RefreshStatus(c *gin.Context) {
	go h.refreshAll()
	c.JSON(http.StatusOK, gin.H{"message": "刷新已触发"})
}

func (h *ServerStatusHandler) GetPublicConfig(c *gin.Context) {
	var cfg models.ServerStatusConfig
	h.DB.First(&cfg)
	c.JSON(http.StatusOK, gin.H{
		"embed_url": cfg.EmbedURL,
	})
}

func (h *ServerStatusHandler) GetStatusByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效ID"})
		return
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, s := range h.cache {
		if s.ServerID == uint(id) {
			c.JSON(http.StatusOK, s)
			return
		}
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "服务器不存在"})
}
