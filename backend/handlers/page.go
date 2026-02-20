package handlers

import (
	"net/http"

	"hxzd-server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type PageHandler struct {
	DB *gorm.DB
}

func NewPageHandler(db *gorm.DB) *PageHandler {
	return &PageHandler{DB: db}
}

func (h *PageHandler) GetPage(c *gin.Context) {
	slug := c.Param("slug")
	var page models.Page
	if err := h.DB.Where("slug = ?", slug).First(&page).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "页面不存在"})
		return
	}
	c.JSON(http.StatusOK, page)
}

func (h *PageHandler) ListPages(c *gin.Context) {
	var pages []models.Page
	h.DB.Find(&pages)
	c.JSON(http.StatusOK, pages)
}

func (h *PageHandler) UpdatePage(c *gin.Context) {
	slug := c.Param("slug")
	var req struct {
		Title   string `json:"title"`
		Content string `json:"content"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	var page models.Page
	result := h.DB.Where("slug = ?", slug).First(&page)
	if result.RowsAffected == 0 {
		page = models.Page{Slug: slug, Title: req.Title, Content: req.Content}
		h.DB.Create(&page)
	} else {
		h.DB.Model(&page).Updates(map[string]interface{}{
			"title":   req.Title,
			"content": req.Content,
		})
	}

	h.DB.Where("slug = ?", slug).First(&page)
	c.JSON(http.StatusOK, page)
}
