package handlers

import (
	"net/http"

	"hxzd-server/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserHandler struct {
	DB *gorm.DB
}

func NewUserHandler(db *gorm.DB) *UserHandler {
	return &UserHandler{DB: db}
}

func (h *UserHandler) ListUsers(c *gin.Context) {
	var users []models.User
	h.DB.Order("created_at DESC").Find(&users)
	c.JSON(http.StatusOK, users)
}

func (h *UserHandler) UpdateUserRole(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Role string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}
	if req.Role != "admin" && req.Role != "user" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "角色只能是 admin 或 user"})
		return
	}
	h.DB.Model(&models.User{}).Where("id = ?", id).Update("role", req.Role)
	c.JSON(http.StatusOK, gin.H{"message": "角色已更新"})
}

func (h *UserHandler) ResetPassword(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		NewPassword string `json:"new_password" binding:"required,min=6"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "密码至少6位"})
		return
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	h.DB.Model(&models.User{}).Where("id = ?", id).Update("password", string(hash))
	c.JSON(http.StatusOK, gin.H{"message": "密码已重置"})
}

func (h *UserHandler) DeleteUser(c *gin.Context) {
	id := c.Param("id")
	currentID, _ := c.Get("user_id")
	var user models.User
	if err := h.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		return
	}
	if user.ID == currentID.(uint) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不能删除自己"})
		return
	}
	h.DB.Delete(&user)
	c.JSON(http.StatusOK, gin.H{"message": "用户已删除"})
}
