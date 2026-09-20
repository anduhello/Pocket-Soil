# 小土壤本地演示

## 已启动的演示地址

在本机浏览器打开：<http://localhost:3000>

## 随时重新启动

确保 Docker Desktop 已启动后，在项目根目录运行：

```powershell
.\START-DEMO.ps1
```

首次启动会准备 Web、后台任务、搜索和网页处理服务，完成后即可使用本地演示。演示数据存放在 Docker 数据卷中；停止或重启服务不会清空已有收藏。

## 停止演示

```powershell
docker compose -p hothouse-dev -f docker/docker-compose.dev.yml stop
```
