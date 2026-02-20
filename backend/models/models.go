package models

import "time"

type User struct {
	ID          uint      `gorm:"primarykey" json:"id"`
	Username    string    `gorm:"uniqueIndex;size:64;not null" json:"username"`
	Password    string    `gorm:"size:255;not null" json:"-"`
	Email       string    `gorm:"size:255" json:"email"`
	AvatarURL   string    `gorm:"size:512" json:"avatar_url"`
	MinecraftID string    `gorm:"size:64" json:"minecraft_id"`
	Role        string    `gorm:"size:20;default:user" json:"role"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Announcement struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	Title     string    `gorm:"size:255;not null" json:"title"`
	Content   string    `gorm:"type:text" json:"content"`
	AuthorID  uint      `json:"author_id"`
	Author    User      `gorm:"foreignKey:AuthorID" json:"author"`
	IsPinned  bool      `gorm:"default:false" json:"is_pinned"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type ForumPost struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	Title     string         `gorm:"size:255;not null" json:"title"`
	Content   string         `gorm:"type:text" json:"content"`
	AuthorID  uint           `json:"author_id"`
	Author    User           `gorm:"foreignKey:AuthorID" json:"author"`
	Category  string         `gorm:"size:64" json:"category"`
	IsPinned  bool           `gorm:"default:false" json:"is_pinned"`
	ViewCount int            `gorm:"default:0" json:"view_count"`
	Comments  []ForumComment `gorm:"foreignKey:PostID" json:"comments,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
}

type ForumComment struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	PostID    uint      `json:"post_id"`
	AuthorID  uint      `json:"author_id"`
	Author    User      `gorm:"foreignKey:AuthorID" json:"author"`
	Content   string    `gorm:"type:text" json:"content"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type SiteSetting struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	Key       string    `gorm:"uniqueIndex;size:128;not null" json:"key"`
	Value     string    `gorm:"type:text" json:"value"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Page struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	Slug      string    `gorm:"uniqueIndex;size:64;not null" json:"slug"`
	Title     string    `gorm:"size:255" json:"title"`
	Content   string    `gorm:"type:longtext" json:"content"`
	UpdatedAt time.Time `json:"updated_at"`
}

type ServerStatusConfig struct {
	ID              uint      `gorm:"primarykey" json:"id"`
	EmbedURL        string    `gorm:"size:512" json:"embed_url"`
	MCServerAddress string    `gorm:"size:255" json:"mc_server_address"`
	MCServerPort    int       `gorm:"default:25565" json:"mc_server_port"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// GameServer 多服务器配置
type GameServer struct {
	ID         uint      `gorm:"primarykey" json:"id"`
	Name       string    `gorm:"size:128;not null" json:"name"`
	Address    string    `gorm:"size:255;not null" json:"address"`
	ServerType string    `gorm:"size:64" json:"server_type"`
	SortOrder  int       `gorm:"default:0" json:"sort_order"`
	Enabled    bool      `gorm:"default:true" json:"enabled"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// WorldMap 世界地图配置
type WorldMap struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	Name      string    `gorm:"size:128;not null" json:"name"`
	EmbedURL  string    `gorm:"size:512;not null" json:"embed_url"`
	SortOrder int       `gorm:"default:0" json:"sort_order"`
	Enabled   bool      `gorm:"default:true" json:"enabled"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
