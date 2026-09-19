# GitHub Stars 与建设中入口

- 导入页的收藏来源并列提供 Bilibili、GitHub Stars、小红书、抖音。
- 小红书和抖音只显示建设中提示与原创小苗施工员插画；没有后台读取请求。
- GitHub 使用固定的 `api.github.com/users/{username}/starred` 官方公开接口，不收集密码或 Cookie，不支持私人星标，不下载代码、README 或封面。
- 输入示例：`https://github.com/anduhello?tab=stars`。
- 每页 100 条，每次最多 5 页、500 个仓库，总超时 45 秒。存在下一页时明确提示结果截断；不声称已经读取所有收藏。
- 名称、规范仓库链接、公开简介、语言与 Topics 用于预览及卡片展示。公开接口限额不足会提示稍后重试，失败不创建收藏。
- 过长的公开简介最多保存 4000 字符，AI 输入仍最多 1200 字符。真实测试中发现 55700 字符的仓库描述，已验证不会因此中断整份列表。
- 导入沿用选择确认、账户隔离、去重、不覆盖已有收藏、导入任务与失败重试流程。
- 可选择 AI 标签匹配（可能收费）或仅读取。AI 使用公开元数据和本人最常用的最多 200 个标签名称，不读取代码。不足以产生 3 个标签时不凑数。
- B站及 GitHub 仓库导入仅保存元数据，跳过网页截图与爬虫；逐张整理支持当前已加载的这两类收藏。
- 小苗插画通过内置图像生成工具制作，保存在 `apps/web/public/seedbed-construction.png`。提示词：原创浅绿小苗施工员、叶子耳朵、安全帽、小铲子、交通锥、温和纸质插画、透明背景，无文字或平台角色。
- 自动测试默认使用模拟响应；设置 `SEEDBED_LIVE_GITHUB_TEST=1` 可执行一次公开读取验证，不保存数据、不调用 AI。
- 2026-09-18 实测指定的 anduhello 公开 Stars：成功读取 11 个仓库，未截断。示例：langgenius/dify、fastapi/fastapi、langchain-ai/langgraph。没有自动导入到真实账号。

官方接口文档：https://docs.github.com/en/rest/activity/starring#list-repositories-starred-by-a-user
