package handlers

import (
	"net/http"
	"strconv"

	"hxzd-server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AnnouncementHandler struct {
	DB *gorm.DB
}

func NewAnnouncementHandler(db *gorm.DB) *AnnouncementHandler {
	return &AnnouncementHandler{DB: db}
}

func (h *AnnouncementHandler) List(c *gin.Context) {
	var items []models.Announcement
	h.DB.Preload("Author").Order("is_pinned DESC, created_at DESC").Find(&items)
	c.JSON(http.StatusOK, items)
}

func (h *AnnouncementHandler) Get(c *gin.Context) {
	id := c.Param("id")
	var item models.Announcement
	if err := h.DB.Preload("Author").First(&item, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "公告不存在"})
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *AnnouncementHandler) Latest(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "5"))
	if limit <= 0 || limit > 20 {
		limit = 5
	}
	var items []models.Announcement
	h.DB.Order("is_pinned DESC, created_at DESC").Limit(limit).Find(&items)
	c.JSON(http.StatusOK, items)
}

func (h *AnnouncementHandler) Create(c *gin.Context) {
	var req struct {
		Title    string `json:"title" binding:"required"`
		Content  string `json:"content"`
		IsPinned bool   `json:"is_pinned"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	userID, _ := c.Get("user_id")
	item := models.Announcement{
		Title:    req.Title,
		Content:  req.Content,
		AuthorID: userID.(uint),
		IsPinned: req.IsPinned,
	}
	h.DB.Create(&item)
	h.DB.Preload("Author").First(&item, item.ID)
	c.JSON(http.StatusOK, item)
}

func (h *AnnouncementHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var item models.Announcement
	if err := h.DB.First(&item, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "公告不存在"})
		return
	}

	var req struct {
		Title    *string `json:"title"`
		Content  *string `json:"content"`
		IsPinned *bool   `json:"is_pinned"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	updates := map[string]interface{}{}
	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.Content != nil {
		updates["content"] = *req.Content
	}
	if req.IsPinned != nil {
		updates["is_pinned"] = *req.IsPinned
	}

	h.DB.Model(&item).Updates(updates)
	h.DB.Preload("Author").First(&item, item.ID)
	c.JSON(http.StatusOK, item)
}

func (h *AnnouncementHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.DB.Delete(&models.Announcement{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "已删除"})
}
