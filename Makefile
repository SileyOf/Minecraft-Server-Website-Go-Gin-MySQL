.PHONY: dev build clean

# 开发模式 - 启动后端
dev:
	cd backend && go run main.go

# 构建生产版本
build:
	cd backend && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o ../dist/hxzd-server .
	cp -r css js index.html login.html forum.html admin.html \
		gameplay.html about.html announcements.html sponsor.html \
		status.html map.html dist/ 2>/dev/null || true
	@echo "Build complete → dist/"

# 安装依赖
deps:
	cd backend && go mod tidy

clean:
	rm -rf dist
