package handlers

import (
	"net/http"
	"strconv"

	"hxzd-server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ForumHandler struct {
	DB *gorm.DB
}

func NewForumHandler(db *gorm.DB) *ForumHandler {
	return &ForumHandler{DB: db}
}

func (h *ForumHandler) ListPosts(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))
	category := c.Query("category")

	if page < 1 {
		page = 1
	}
	if size < 1 || size > 50 {
		size = 20
	}

	query := h.DB.Model(&models.ForumPost{})
	if category != "" {
		query = query.Where("category = ?", category)
	}

	var total int64
	query.Count(&total)

	var posts []models.ForumPost
	query.Preload("Author").
		Order("is_pinned DESC, created_at DESC").
		Offset((page - 1) * size).
		Limit(size).
		Find(&posts)

	c.JSON(http.StatusOK, gin.H{
		"posts": posts,
		"total": total,
		"page":  page,
		"size":  size,
	})
}

func (h *ForumHandler) GetPost(c *gin.Context) {
	id := c.Param("id")
	var post models.ForumPost
	if err := h.DB.Preload("Author").Preload("Comments", func(db *gorm.DB) *gorm.DB {
		return db.Order("created_at ASC")
	}).Preload("Comments.Author").First(&post, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "帖子不存在"})
		return
	}

	// 增加浏览量
	h.DB.Model(&post).UpdateColumn("view_count", gorm.Expr("view_count + 1"))

	c.JSON(http.StatusOK, post)
}

func (h *ForumHandler) CreatePost(c *gin.Context) {
	var req struct {
		Title    string `json:"title" binding:"required"`
		Content  string `json:"content" binding:"required"`
		Category string `json:"category"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	userID, _ := c.Get("user_id")
	post := models.ForumPost{
		Title:    req.Title,
		Content:  req.Content,
		Category: req.Category,
		AuthorID: userID.(uint),
	}
	h.DB.Create(&post)
	h.DB.Preload("Author").First(&post, post.ID)
	c.JSON(http.StatusOK, post)
}

func (h *ForumHandler) UpdatePost(c *gin.Context) {
	id := c.Param("id")
	userID, _ := c.Get("user_id")
	role, _ := c.Get("role")

	var post models.ForumPost
	if err := h.DB.First(&post, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "帖子不存在"})
		return
	}

	// 只有作者或管理员可以编辑
	if post.AuthorID != userID.(uint) && role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "没有权限"})
		return
	}

	var req struct {
		Title    *string `json:"title"`
		Content  *string `json:"content"`
		Category *string `json:"category"`
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
	if req.Category != nil {
		updates["category"] = *req.Category
	}
	if req.IsPinned != nil && role == "admin" {
		updates["is_pinned"] = *req.IsPinned
	}

	h.DB.Model(&post).Updates(updates)
	h.DB.Preload("Author").First(&post, post.ID)
	c.JSON(http.StatusOK, post)
}

func (h *ForumHandler) DeletePost(c *gin.Context) {
	id := c.Param("id")
	userID, _ := c.Get("user_id")
	role, _ := c.Get("role")

	var post models.ForumPost
	if err := h.DB.First(&post, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "帖子不存在"})
		return
	}

	if post.AuthorID != userID.(uint) && role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "没有权限"})
		return
	}

	// 删除帖子的所有评论
	h.DB.Where("post_id = ?", post.ID).Delete(&models.ForumComment{})
	h.DB.Delete(&post)
	c.JSON(http.StatusOK, gin.H{"message": "已删除"})
}

func (h *ForumHandler) CreateComment(c *gin.Context) {
	postID := c.Param("id")
	var post models.ForumPost
	if err := h.DB.First(&post, postID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "帖子不存在"})
		return
	}

	var req struct {
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	userID, _ := c.Get("user_id")
	comment := models.ForumComment{
		PostID:   post.ID,
		AuthorID: userID.(uint),
		Content:  req.Content,
	}
	h.DB.Create(&comment)
	h.DB.Preload("Author").First(&comment, comment.ID)
	c.JSON(http.StatusOK, comment)
}

func (h *ForumHandler) DeleteComment(c *gin.Context) {
	commentID := c.Param("commentId")
	userID, _ := c.Get("user_id")
	role, _ := c.Get("role")

	var comment models.ForumComment
	if err := h.DB.First(&comment, commentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "评论不存在"})
		return
	}

	if comment.AuthorID != userID.(uint) && role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "没有权限"})
		return
	}

	h.DB.Delete(&comment)
	c.JSON(http.StatusOK, gin.H{"message": "已删除"})
}
