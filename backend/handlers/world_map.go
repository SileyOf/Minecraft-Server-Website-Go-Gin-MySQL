package handlers

import (
	"net/http"

	"hxzd-server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type WorldMapHandler struct {
	DB *gorm.DB
}

func NewWorldMapHandler(db *gorm.DB) *WorldMapHandler {
	return &WorldMapHandler{DB: db}
}

// ListMaps 公开接口 — 返回已启用的地图
func (h *WorldMapHandler) ListMaps(c *gin.Context) {
	var maps []models.WorldMap
	h.DB.Where("enabled = ?", true).Order("sort_order ASC, id ASC").Find(&maps)
	c.JSON(http.StatusOK, maps)
}

// AdminListMaps 管理员 — 返回全部地图
func (h *WorldMapHandler) AdminListMaps(c *gin.Context) {
	var maps []models.WorldMap
	h.DB.Order("sort_order ASC, id ASC").Find(&maps)
	c.JSON(http.StatusOK, maps)
}

// CreateMap 管理员 — 新建地图
func (h *WorldMapHandler) CreateMap(c *gin.Context) {
	var req struct {
		Name      string `json:"name" binding:"required"`
		EmbedURL  string `json:"embed_url" binding:"required"`
		SortOrder int    `json:"sort_order"`
		Enabled   *bool  `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}

	m := models.WorldMap{
		Name:      req.Name,
		EmbedURL:  req.EmbedURL,
		SortOrder: req.SortOrder,
		Enabled:   enabled,
	}
	h.DB.Create(&m)
	c.JSON(http.StatusOK, m)
}

// UpdateMap 管理员 — 更新地图
func (h *WorldMapHandler) UpdateMap(c *gin.Context) {
	id := c.Param("id")
	var m models.WorldMap
	if err := h.DB.First(&m, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "地图不存在"})
		return
	}

	var req struct {
		Name      *string `json:"name"`
		EmbedURL  *string `json:"embed_url"`
		SortOrder *int    `json:"sort_order"`
		Enabled   *bool   `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	updates := map[string]interface{}{}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.EmbedURL != nil {
		updates["embed_url"] = *req.EmbedURL
	}
	if req.SortOrder != nil {
		updates["sort_order"] = *req.SortOrder
	}
	if req.Enabled != nil {
		updates["enabled"] = *req.Enabled
	}

	h.DB.Model(&m).Updates(updates)
	h.DB.First(&m, id)
	c.JSON(http.StatusOK, m)
}

// DeleteMap 管理员 — 删除地图
func (h *WorldMapHandler) DeleteMap(c *gin.Context) {
	id := c.Param("id")
	var m models.WorldMap
	if err := h.DB.First(&m, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "地图不存在"})
		return
	}
	h.DB.Delete(&m)
	c.JSON(http.StatusOK, gin.H{"message": "已删除"})
}
