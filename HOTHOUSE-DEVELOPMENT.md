# 本地二次开发

在此项目根目录的 PowerShell 终端运行（不是 Python 或 MySQL 终端）：

```powershell
docker compose --project-name hothouse-dev --env-file .env.docker.local -f docker/docker-compose.dev.yml -f docker/docker-compose.hothouse.yml up -d --build
```

- `--project-name hothouse-dev`：给这组容器和数据卷独立命名，避免与其他项目混用。
- `--env-file .env.docker.local`：读取本机登录签名密钥；该文件被 Git 忽略，不要上传或分享。
- 两个 `-f`：先读取官方开发配置，再叠加本机配置，不直接重写官方文件。
- `up`：准备并启动服务。
- `-d`：后台运行，关闭终端后服务仍可运行。
- `--build`：构建运行本地源码的开发镜像，不是拉取一个不含本地修改的成品网站。

首次启动需下载镜像、安装依赖并初始化 SQLite，只有这些成功后网页才可用。网站仅绑定本机 `http://localhost:3000`。这不是上线配置，不应直接对外发布。

Windows 适配：叠加配置为各工作区的 `node_modules` 提供共享 Docker 命名卷，避免 pnpm 在 Windows 共享目录中重命名依赖包时出现 EACCES。源码仍挂载到容器，依赖存放在 Linux 卷中；web、workers 和 prep 使用同一套依赖卷。初始安装失败时的下载缓存也可复用，不需要删除源码或收藏卷。

查看状态与日志：

```powershell
docker compose --project-name hothouse-dev --env-file .env.docker.local -f docker/docker-compose.dev.yml -f docker/docker-compose.hothouse.yml ps -a
docker compose --project-name hothouse-dev --env-file .env.docker.local -f docker/docker-compose.dev.yml -f docker/docker-compose.hothouse.yml logs --tail 80 prep web workers
```

`ps -a` 查看所有服务，包括已退出的初始化任务。`prep` 成功初始化后退出是正常的，退出码为 0 才表示成功。`logs --tail 80` 查看各服务最近 80 行日志以定位失败原因。

普通停止（保留数据）：

```powershell
docker compose --project-name hothouse-dev --env-file .env.docker.local -f docker/docker-compose.dev.yml -f docker/docker-compose.hothouse.yml stop
```

`stop` 停止运行但保留容器及数据。不要随意加 `down -v`：`-v` 会删除数据卷，其中包含收藏数据库。

收藏数据位于独立 Docker data 卷，不在 myapp 的 MySQL 中。源码、依赖和收藏数据是三种不同的东西，Git 只用于记录源码，不代替数据库备份。

本阶段不配置付费 AI，先体验注册、保存公开网址、自动抓取标题/封面、列表与标签、搜索、跳转原网页。登录才能访问的第三方收藏夹不保证直接导入，需要后续逐个平台实现适配，禁止绕过访问权限。
