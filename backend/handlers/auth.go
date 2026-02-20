package handlers

import (
	"net/http"

	"hxzd-server/config"
	"hxzd-server/models"
	"hxzd-server/utils"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthHandler struct {
	DB  *gorm.DB
	Cfg *config.Config
}

func NewAuthHandler(db *gorm.DB, cfg *config.Config) *AuthHandler {
	return &AuthHandler{DB: db, Cfg: cfg}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req struct {
		Username    string `json:"username" binding:"required,min=2,max=32"`
		Password    string `json:"password" binding:"required,min=6"`
		Email       string `json:"email"`
		MinecraftID string `json:"minecraft_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误: " + err.Error()})
		return
	}

	var existing models.User
	if h.DB.Where("username = ?", req.Username).First(&existing).Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "用户名已被使用"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "密码加密失败"})
		return
	}

	user := models.User{
		Username:    req.Username,
		Password:    string(hash),
		Email:       req.Email,
		MinecraftID: req.MinecraftID,
		Role:        "user",
	}
	if err := h.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "注册失败"})
		return
	}

	token, _ := utils.GenerateToken(user.ID, user.Username, user.Role, h.Cfg.JWTSecret, h.Cfg.JWTExpiry)
	c.JSON(http.StatusOK, gin.H{"token": token, "user": user})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	var user models.User
	if err := h.DB.Where("username = ?", req.Username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
		return
	}

	token, _ := utils.GenerateToken(user.ID, user.Username, user.Role, h.Cfg.JWTSecret, h.Cfg.JWTExpiry)
	c.JSON(http.StatusOK, gin.H{"token": token, "user": user})
}

func (h *AuthHandler) Me(c *gin.Context) {
	userID, _ := c.Get("user_id")
	var user models.User
	if err := h.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		return
	}
	c.JSON(http.StatusOK, user)
}

func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	userID, _ := c.Get("user_id")
	var req struct {
		Email       *string `json:"email"`
		AvatarURL   *string `json:"avatar_url"`
		MinecraftID *string `json:"minecraft_id"`
		Username    *string `json:"username"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	updates := map[string]interface{}{}
	if req.Email != nil {
		updates["email"] = *req.Email
	}
	if req.AvatarURL != nil {
		updates["avatar_url"] = *req.AvatarURL
	}
	if req.MinecraftID != nil {
		updates["minecraft_id"] = *req.MinecraftID
	}
	if req.Username != nil && *req.Username != "" {
		if len(*req.Username) < 2 || len(*req.Username) > 32 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "用户名需要2-32个字符"})
			return
		}
		var existing models.User
		if h.DB.Where("username = ? AND id != ?", *req.Username, userID).First(&existing).Error == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "用户名已被使用"})
			return
		}
		updates["username"] = *req.Username
	}

	h.DB.Model(&models.User{}).Where("id = ?", userID).Updates(updates)

	var user models.User
	h.DB.First(&user, userID)
	c.JSON(http.StatusOK, user)
}

func (h *AuthHandler) ChangePassword(c *gin.Context) {
	userID, _ := c.Get("user_id")
	var req struct {
		OldPassword string `json:"old_password" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=6"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	var user models.User
	h.DB.First(&user, userID)

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.OldPassword)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "旧密码错误"})
		return
	}

	hash, _ := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	h.DB.Model(&user).Update("password", string(hash))
	c.JSON(http.StatusOK, gin.H{"message": "密码已更新"})
}
