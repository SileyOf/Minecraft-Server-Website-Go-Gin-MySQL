package database

import (
	"fmt"
	"log"
	"time"

	"hxzd-server/config"
	"hxzd-server/models"

	mysqldriver "github.com/go-sql-driver/mysql"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func InitDB(cfg *config.Config) *gorm.DB {
	// 先连接 MySQL 并尝试创建数据库
	noDB := mysqldriver.Config{
		User:                 cfg.DBUser,
		Passwd:               cfg.DBPassword,
		Net:                  "tcp",
		Addr:                 cfg.DBHost + ":" + cfg.DBPort,
		AllowNativePasswords: true,
	}
	createDSN := noDB.FormatDSN()

	tmpDB, err := gorm.Open(mysql.Open(createDSN), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to MySQL: %v", err)
	}
	tmpDB.Exec(fmt.Sprintf("CREATE DATABASE IF NOT EXISTS `%s` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci", cfg.DBName))

	// 连接目标数据库
	dbCfg := mysqldriver.Config{
		User:                 cfg.DBUser,
		Passwd:               cfg.DBPassword,
		Net:                  "tcp",
		Addr:                 cfg.DBHost + ":" + cfg.DBPort,
		DBName:               cfg.DBName,
		ParseTime:            true,
		Loc:                  time.UTC,
		AllowNativePasswords: true,
	}
	dsn := dbCfg.FormatDSN()

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// 自动迁移
	if err := db.AutoMigrate(
		&models.User{},
		&models.Announcement{},
		&models.ForumPost{},
		&models.ForumComment{},
		&models.SiteSetting{},
		&models.Page{},
		&models.ServerStatusConfig{},
		&models.GameServer{},
		&models.WorldMap{},
	); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	log.Println("Database connected and migrated successfully")
	return db
}

func SeedDefaults(db *gorm.DB) {
	// 默认管理员
	var count int64
	db.Model(&models.User{}).Count(&count)
	if count == 0 {
		hash, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		db.Create(&models.User{
			Username: "admin",
			Password: string(hash),
			Role:     "admin",
			Email:    "admin@hxzd.com",
		})
		log.Println("Created default admin user (admin / admin123)")
	}

	// 默认设置
	defaults := map[string]string{
		"site_title":       "花夏之都",
		"site_subtitle":    "Minecraft 生存服务器",
		"site_description": "一个充满冒险与创造的 Minecraft 服务器",
		"main_title":       "HXZD",
		"background_url":   "",
		"favicon_url":      "",
		"footer_text":      "",
	}
	for k, v := range defaults {
		var existing models.SiteSetting
		if db.Where("`key` = ?", k).First(&existing).RowsAffected == 0 {
			db.Create(&models.SiteSetting{Key: k, Value: v})
		}
	}

	// 默认页面
	pages := []models.Page{
		{Slug: "gameplay", Title: "玩法介绍", Content: "<h2>玩法介绍</h2><p>欢迎来到花夏之都！这里有丰富的生存玩法等你探索。</p>"},
		{Slug: "about", Title: "关于我们", Content: "<h2>关于花夏之都</h2><p>花夏之都是一个专注于玩家体验的 Minecraft 生存服务器。</p>"},
		{Slug: "sponsor", Title: "赞助支持", Content: "<h2>赞助支持</h2><p>您的支持是我们持续运营的动力！</p>"},
	}
	for _, p := range pages {
		var existing models.Page
		if db.Where("slug = ?", p.Slug).First(&existing).RowsAffected == 0 {
			db.Create(&p)
		}
	}

	// 默认服务器状态配置
	var ssCfg models.ServerStatusConfig
	if db.First(&ssCfg).RowsAffected == 0 {
		db.Create(&models.ServerStatusConfig{
			MCServerAddress: "play.hxzd.com",
			MCServerPort:    25565,
		})
	}

	// 默认游戏服务器
	var gsCount int64
	db.Model(&models.GameServer{}).Count(&gsCount)
	if gsCount == 0 {
		db.Create(&models.GameServer{
			Name:       "主服务器",
			Address:    "play.hxzd.com",
			ServerType: "生存",
			SortOrder:  0,
			Enabled:    true,
		})
	}

	// 默认世界地图
	var wmCount int64
	db.Model(&models.WorldMap{}).Count(&wmCount)
	if wmCount == 0 {
		db.Create(&models.WorldMap{
			Name:      "卫星地图",
			EmbedURL:  "",
			SortOrder: 0,
			Enabled:   true,
		})
	}
}
