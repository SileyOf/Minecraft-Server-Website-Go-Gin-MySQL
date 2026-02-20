package config

import (
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	JWTSecret  string
	JWTExpiry  time.Duration
	Port       string
	MCServer   string
	MCPort     string
	StaticDir  string
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	expiry, err := time.ParseDuration(getEnv("JWT_EXPIRY", "72h"))
	if err != nil {
		expiry = 72 * time.Hour
	}

	return &Config{
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "3306"),
		DBUser:     getEnv("DB_USER", "root"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		DBName:     getEnv("DB_NAME", "hxzd"),
		JWTSecret:  getEnv("JWT_SECRET", "change-me"),
		JWTExpiry:  expiry,
		Port:       getEnv("PORT", "8080"),
		MCServer:   getEnv("MC_SERVER", "play.hxzd.com"),
		MCPort:     getEnv("MC_PORT", "25565"),
		StaticDir:  getEnv("STATIC_DIR", "../"),
	}
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok {
		return v
	}
	return fallback
}
