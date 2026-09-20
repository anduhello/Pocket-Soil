# 启动小土壤本地演示环境（需要已安装并启动 Docker Desktop）。
$demoRoot = $PSScriptRoot

Set-Location $demoRoot
docker compose -p hothouse-dev -f docker/docker-compose.dev.yml up -d

Write-Host "小土壤本地演示已启动： http://localhost:3000" -ForegroundColor Green
Write-Host "首次启动需要下载并准备运行环境，请稍等片刻后在浏览器打开链接。" -ForegroundColor Yellow
