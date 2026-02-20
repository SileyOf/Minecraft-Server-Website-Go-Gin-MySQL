package handlers

import (
	"net/http"

	"hxzd-server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type SettingsHandler struct {
	DB *gorm.DB
}

func NewSettingsHandler(db *gorm.DB) *SettingsHandler {
	return &SettingsHandler{DB: db}
}

func (h *SettingsHandler) GetPublicSettings(c *gin.Context) {
	var settings []models.SiteSetting
	h.DB.Find(&settings)
	result := make(map[string]string)
	for _, s := range settings {
		result[s.Key] = s.Value
	}
	c.JSON(http.StatusOK, result)
}

func (h *SettingsHandler) GetAllSettings(c *gin.Context) {
	var settings []models.SiteSetting
	h.DB.Find(&settings)
	c.JSON(http.StatusOK, settings)
}

func (h *SettingsHandler) UpdateSettings(c *gin.Context) {
	var req map[string]string
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	for key, value := range req {
		var setting models.SiteSetting
		result := h.DB.Where("`key` = ?", key).First(&setting)
		if result.RowsAffected == 0 {
			h.DB.Create(&models.SiteSetting{Key: key, Value: value})
		} else {
			h.DB.Model(&setting).Update("value", value)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "设置已更新"})
}
