# Changelog

## Unreleased

### 新增
- 支持通过 `CODEX_SESSION_SOURCES` 配置多个本地 Codex 来源，用于同时管理 API Key 与 ChatGPT 登录等不同 `CODEX_HOME` 下的会话。
- 支持读取每个 `codexHome` 下的 `sessions` 与 `archived_sessions`，并在列表中显示来源与归档状态。
- 新增轻量会话索引接口 `/__sessions_index`，列表页只加载元数据，打开详情时再按需读取完整 JSONL。
- 支持从 `session_index.jsonl` 与 Codex App 的 `state_5.sqlite` 读取会话标题，优先展示更接近 Codex App 的会话名称。
- 新增按项目、来源、日期分组的中文界面，并默认使用类似 Codex App 的项目分组列表。
- 新增批量选择、删除所选、选择本项目、删除本项目等批量会话管理操作。
- 新增直接删除本地会话文件的接口，并在删除后同步清理 Codex App 中对应的空项目/线程索引残留。
- 新增恢复命令弹窗：点击“恢复命令”时显示 PowerShell 命令并自动复制，剪贴板权限被拒绝时使用隐藏 textarea 兜底复制。
- 新增详情弹窗懒加载会话全文，避免列表页一次性解析大型会话文件。
- 新增中英文语言切换，选择会写入浏览器本地存储并在刷新后保留。
- README 新增 Windows 本机部署说明，覆盖直接在 PowerShell 中配置 `CODEX_SESSION_SOURCES` 并启动 Vite 的流程。

### 变更
- 将原来的卡片式会话展示改为紧凑行列表，显示会话名称、更新时间、来源、项目路径和详情入口。
- 将“删除命令”改为直接“删除”，点击后弹出确认框，确认后执行本地删除。
- 将删除确认框区分为单条“确认删除会话”和多条“确认批量删除”。
- 将新建会话与恢复会话命令改为来源感知：配置了 `codexHome` 时会设置对应的 `CODEX_HOME`。
- 将文档中的本机路径示例替换为通用占位符，避免公开仓库暴露个人本地路径。

### 修复
- 修复详情打开时可能因未加载完整 JSONL 导致消息为空或字段缺失的问题。
- 修复大型 JSONL 解析时可能出现栈溢出的问题。
- 修复删除后过度清理 `session_index.jsonl` 导致会话名称丢失的问题。
- 修复浏览器拒绝 `navigator.clipboard.writeText` 时恢复命令无法复制的问题。

### 安全与隐私
- `.env`、本地日志、`dist/`、`node_modules/`、本地 worktree 与会话数据目录均保持忽略，不应提交到仓库。
- 当前功能只读取/管理本地会话文件，不上传 Codex 会话内容、账号凭据或 API Key。
