<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/github/languages/top/coramba/codex-sessions-manager" alt="Top Language">
  <img src="https://img.shields.io/badge/Framework-Vue%203-42b883" alt="Vue 3">
  <img src="https://img.shields.io/badge/UI-Vuetify%203-1867c0" alt="Vuetify 3">
  <img src="https://img.shields.io/badge/Bundler-Vite-646cff" alt="Vite">
</p>

# Codex 会话管理器

语言：[English](README.md) | 简体中文

Codex 会话管理器是一个本地运行的 SPA 界面，用来浏览、恢复和管理 Codex coding agent 生成的本机会话文件。

默认情况下，如果忘记保存 Codex 会话 ID，就需要手动进入 `.codex/sessions` 目录逐个查看 JSONL 文件。这个工具会直接读取本机会话目录，按项目、来源和日期展示会话，并生成可复制的恢复命令。

本工具完全在本机运行，不会上传会话内容、账号凭据、API Key 或任何登录状态。

## 功能特性

- 📂 **浏览本地 Codex 会话**  
  自动发现并展示 Codex 保存的 JSONL 会话文件。
- ⚡ **一键显示/复制恢复命令**  
  支持生成包含正确 `CODEX_HOME` 和项目目录的 PowerShell 恢复命令。
- 📝 **查看完整会话详情**  
  列表页只读取索引，点击详情时再按需加载完整会话内容。
- 🧹 **删除空会话或无用会话**  
  支持单条删除、批量删除、按项目删除，并在删除后刷新列表。
- 🗂 **按项目、来源、日期分组**
- 👥 **管理多个本地 Codex Home**  
  可以把 API Key 登录和 ChatGPT 登录产生的不同 `CODEX_HOME` 配置成独立来源；不需要登录，也不会读取或修改 `auth.json`。
- 🌐 **中英文界面切换**  
  支持简体中文和 English，语言选择会保存在浏览器本地存储中。

## 安装与部署

你可以直接在 Windows 本机运行，也可以使用原始的 WSL/Docker 方式部署。

### Windows 本机部署

当 Codex 和会话文件都在 Windows 主机上时，推荐使用此方式。例如会话位于：

```text
C:\Users\<WindowsUser>\.codex
```

1) **安装依赖**

```powershell
pnpm install
```

2) **配置需要扫描的 Codex Home**

单个来源示例：

```powershell
$env:CODEX_SESSION_SOURCES='[{"id":"default-apikey","name":"Default API Key","codexHome":"C:/Users/<WindowsUser>/.codex"}]'
```

如果 API Key 会话和 ChatGPT 登录会话分别存放在不同 `CODEX_HOME`，可以配置多个来源：

```powershell
$env:CODEX_SESSION_SOURCES='[{"id":"default-apikey","name":"Default API Key","codexHome":"C:/Users/<WindowsUser>/.codex"},{"id":"chatgpt","name":"ChatGPT Login","codexHome":"C:/Users/<WindowsUser>/.codex-chatgpt"}]'
```

3) **启动本地 Web UI**

```powershell
pnpm run dev -- --host 127.0.0.1 --port 5172
```

4) **打开浏览器**

访问：

```text
http://127.0.0.1:5172/
```

如果希望固定配置，可以复制 `.env.example` 为 `.env`，把 `CODEX_SESSION_SOURCES`、`VITE_HOST`、`VITE_PORT` 写入 `.env`。

### 多来源本地会话管理

`CODEX_SESSION_SOURCES` 是推荐配置。它适合在同一台电脑上管理多个 Codex 账号或认证方式产生的本地会话。

每个来源可以是完整的 `codexHome`：

```env
CODEX_SESSION_SOURCES='[
  {"id":"default-apikey","name":"Default API Key","codexHome":"C:/Users/<WindowsUser>/.codex"},
  {"id":"chatgpt","name":"ChatGPT Login","codexHome":"C:/Users/<WindowsUser>/.codex-chatgpt"}
]'
```

对每个 `codexHome`，应用会扫描：

```text
<codexHome>/sessions
<codexHome>/archived_sessions
```

也可以直接指向某个挂载后的会话目录：

```env
CODEX_SESSION_SOURCES='[
  {"id":"wsl","name":"WSL mounted sessions","sessionsPath":"/home/<user>/.codex/sessions"}
]'
```

如果来源配置了 `codexHome`，恢复命令会自动带上匹配的 `CODEX_HOME`，例如：

```powershell
$env:CODEX_HOME="C:\Users\<WindowsUser>\.codex"; Set-Location "E:\AI\Project"; codex resume <SESSION_ID>
```

这样即使官方 Codex App 或会话选择器只显示当前登录方式下的线程，本工具也可以在同一个界面中显示多个本地来源的历史会话。

### WSL/Docker 部署

当 Codex 在 WSL 中运行、会话保存在 WSL 目录中时，可以使用 Docker 方式。

#### 前置条件

- Windows 10/11，并启用 WSL2。
- 安装 Docker Desktop，并启用 WSL 后端。
- 容器中安装 pnpm，或使用 `corepack enable`。
- Codex 可以在 WSL 中直接运行。

#### 会话目录布局

- Codex 在 WSL 中通常写入 `/home/<user>/.codex/sessions/`。
- 应用可以使用仓库内的 `sessions/` 目录作为挂载点。
- 需要把 WSL 会话目录挂载到容器内，例如 `/var/www/codex-sessions-manager/sessions`。

#### 运行容器

1) **在 WSL 中进入项目目录**

```bash
cd /var/www/codex-sessions-manager
```

2) **构建镜像**

```bash
docker build -t codex-sessions-manager .
```

3) **挂载会话目录并启动**

把 `<user>` 替换为你的 WSL 用户名：

```bash
docker run --rm -it \
  -p 5172:5172 \
  -v /home/<user>/.codex/sessions:/var/www/codex-sessions-manager/sessions \
  codex-sessions-manager \
  pnpm run dev -- --host "$VITE_HOST" --port "$VITE_PORT"
```

4) **打开应用**

在 Windows 浏览器中访问：

```text
http://localhost:5172
```

## 使用说明

- 在 Codex 产生会话后，点击页面右上角“刷新”更新列表。
- 点击“详情”会按需加载完整 JSONL 内容。
- 点击“恢复命令”会显示 PowerShell 命令并尝试复制到剪贴板。
- 点击“删除”会先弹出确认框，确认后才删除本地 JSONL 文件。
- 删除整个项目的会话时，会同步清理 Codex App 中残留的空项目/线程索引。

## 生产构建

```powershell
pnpm run build
```

构建产物位于 `dist/`。可以用任意静态文件服务器托管，或使用：

```powershell
pnpm run preview -- --host 127.0.0.1 --port 5172
```

## 故障排查

- **页面没有会话**：确认 `CODEX_SESSION_SOURCES` 指向存在的 `codexHome`，或确认 `SESSIONS_ROOT_PATH` 指向正确的会话目录。
- **只看到一个账号/来源的会话**：历史 JSONL 文件通常不包含可靠账号标识。请把每个独立 `CODEX_HOME` 配成独立来源。
- **恢复到了错误账号**：请优先使用带 `codexHome` 的来源配置；直接 `sessionsPath` 来源无法确定所属 `CODEX_HOME`。
- **端口冲突**：修改 `VITE_PORT`，并保持启动命令中的 `--port` 一致。
- **WSL 权限问题**：确认 WSL 用户拥有会话目录权限，可以在 WSL 内使用 `chmod` 或 `chown` 修复。

## 隐私说明

- 应用只读取本地会话文件和本地 Codex App 索引。
- 不会上传会话内容。
- 不会上传、读取或修改 API Key。
- 不会登录 Codex 或修改 `auth.json`。
- `.env`、日志、`dist/`、`node_modules/`、本地会话数据目录默认被 `.gitignore` 忽略。
