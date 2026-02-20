package routes

import (
	"net/http"
	"path/filepath"
	"strings"

	"hxzd-server/config"
	"hxzd-server/handlers"
	"hxzd-server/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRoutes(r *gin.Engine, db *gorm.DB, cfg *config.Config) {
	staticDir := cfg.StaticDir

	authHandler := handlers.NewAuthHandler(db, cfg)
	announcementHandler := handlers.NewAnnouncementHandler(db)
	forumHandler := handlers.NewForumHandler(db)
	pageHandler := handlers.NewPageHandler(db)
	settingsHandler := handlers.NewSettingsHandler(db)
	serverStatusHandler := handlers.NewServerStatusHandler(db, cfg)
	userHandler := handlers.NewUserHandler(db)
	worldMapHandler := handlers.NewWorldMapHandler(db)

	// ===== 静态文件 =====
	r.Static("/css", filepath.Join(staticDir, "css"))
	r.Static("/js", filepath.Join(staticDir, "js"))
	r.Static("/assets", filepath.Join(staticDir, "assets"))

	htmlPages := []string{
		"index.html", "login.html", "forum.html", "admin.html",
		"announcements.html", "gameplay.html", "about.html",
		"sponsor.html", "status.html", "map.html",
	}
	for _, page := range htmlPages {
		p := page
		r.GET("/"+p, func(c *gin.Context) {
			c.File(filepath.Join(staticDir, p))
		})
		if p != "index.html" {
			route := "/" + strings.TrimSuffix(p, ".html")
			r.GET(route, func(c *gin.Context) {
				c.File(filepath.Join(staticDir, p))
			})
		}
	}
	r.GET("/", func(c *gin.Context) {
		c.File(filepath.Join(staticDir, "index.html"))
	})

	// ===== API 路由 =====
	api := r.Group("/api")
	{
		// 公开
		api.POST("/auth/register", authHandler.Register)
		api.POST("/auth/login", authHandler.Login)

		api.GET("/announcements", announcementHandler.List)
		api.GET("/announcements/latest", announcementHandler.Latest)
		api.GET("/announcements/:id", announcementHandler.Get)

		api.GET("/forum/posts", forumHandler.ListPosts)
		api.GET("/forum/posts/:id", forumHandler.GetPost)

		api.GET("/pages/:slug", pageHandler.GetPage)
		api.GET("/settings", settingsHandler.GetPublicSettings)
		api.GET("/server-status", serverStatusHandler.GetAllStatus)
		api.GET("/server-status/single", serverStatusHandler.GetStatus)
		api.GET("/server-status/config", serverStatusHandler.GetPublicConfig)
		api.GET("/server-status/:id", serverStatusHandler.GetStatusByID)

		api.GET("/world-maps", worldMapHandler.ListMaps)

		// 需要登录
		auth := api.Group("")
		auth.Use(middleware.AuthMiddleware(cfg.JWTSecret))
		{
			auth.GET("/auth/me", authHandler.Me)
			auth.PUT("/auth/profile", authHandler.UpdateProfile)
			auth.PUT("/auth/password", authHandler.ChangePassword)

			auth.POST("/forum/posts", forumHandler.CreatePost)
			auth.PUT("/forum/posts/:id", forumHandler.UpdatePost)
			auth.DELETE("/forum/posts/:id", forumHandler.DeletePost)
			auth.POST("/forum/posts/:id/comments", forumHandler.CreateComment)
			auth.DELETE("/forum/comments/:commentId", forumHandler.DeleteComment)
		}

		// 管理员
		admin := api.Group("/admin")
		admin.Use(middleware.AuthMiddleware(cfg.JWTSecret))
		admin.Use(middleware.AdminOnly())
		{
			admin.POST("/announcements", announcementHandler.Create)
			admin.PUT("/announcements/:id", announcementHandler.Update)
			admin.DELETE("/announcements/:id", announcementHandler.Delete)

			admin.GET("/pages", pageHandler.ListPages)
			admin.PUT("/pages/:slug", pageHandler.UpdatePage)

			admin.GET("/settings", settingsHandler.GetAllSettings)
			admin.PUT("/settings", settingsHandler.UpdateSettings)

			admin.GET("/users", userHandler.ListUsers)
			admin.PUT("/users/:id/role", userHandler.UpdateUserRole)
			admin.PUT("/users/:id/password", userHandler.ResetPassword)
			admin.DELETE("/users/:id", userHandler.DeleteUser)

			admin.GET("/server-status/config", serverStatusHandler.GetConfig)
			admin.PUT("/server-status/config", serverStatusHandler.UpdateConfig)
			admin.POST("/server-status/refresh", serverStatusHandler.RefreshStatus)

			admin.GET("/servers", serverStatusHandler.ListServers)
			admin.POST("/servers", serverStatusHandler.CreateServer)
			admin.PUT("/servers/:id", serverStatusHandler.UpdateServer)
			admin.DELETE("/servers/:id", serverStatusHandler.DeleteServer)

			admin.GET("/world-maps", worldMapHandler.AdminListMaps)
			admin.POST("/world-maps", worldMapHandler.CreateMap)
			admin.PUT("/world-maps/:id", worldMapHandler.UpdateMap)
			admin.DELETE("/world-maps/:id", worldMapHandler.DeleteMap)
		}
	}

	// SPA fallback
	r.NoRoute(func(c *gin.Context) {
		if !strings.HasPrefix(c.Request.URL.Path, "/api") {
			c.File(filepath.Join(staticDir, "index.html"))
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
	})
}
