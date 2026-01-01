# GitCode 推送指南

## 📋 前提条件

你需要先在 GitCode 上创建仓库并获取访问令牌。

## 🔑 步骤 1: 获取 GitCode 访问令牌

### 方法 1: 通过设置页面

1. 登录 GitCode: https://gitcode.com
2. 点击右上角头像 → **设置**
3. 在左侧菜单找到 **访问令牌** 或 **Personal Access Tokens**
4. 点击 **生成新令牌**
5. 填写信息：
   - **令牌名称**: `KeyboardStatsTracker`
   - **过期时间**: 选择合适的时间
   - **权限范围**: 勾选 `api` 或 `write_repository`
6. 点击 **创建令牌**
7. **立即复制令牌**（只显示一次）

### 方法 2: 直接访问

访问: https://gitcode.com/-/profile/personal_access_tokens

## 📦 步骤 2: 推送代码到 GitCode

### 当前状态

你的本地仓库已经配置了两个远程仓库：
- `origin` → GitHub (https://github.com/Yezi811/keyboard-stats-tracker.git)
- `gitcode` → GitCode (https://gitcode.com/Tongkethon/KeyboardStatsTracker.git)

### 推送命令

```bash
git push gitcode main
```

当提示输入凭据时：
- **Username**: 你的 GitCode 用户名（Tongkethon）
- **Password**: 粘贴你的 GitCode 访问令牌

## 🔄 同时推送到两个平台

### 方法 1: 分别推送

```bash
# 推送到 GitHub
git push origin main

# 推送到 GitCode
git push gitcode main
```

### 方法 2: 同时推送到所有远程仓库

```bash
git push --all
```

### 方法 3: 配置 origin 推送到多个仓库

```bash
# 添加 GitCode 作为 origin 的第二个推送地址
git remote set-url --add --push origin https://gitcode.com/Tongkethon/KeyboardStatsTracker.git

# 这样 git push 会同时推送到 GitHub 和 GitCode
git push
```

## 📝 管理多个远程仓库

### 查看所有远程仓库

```bash
git remote -v
```

### 重命名远程仓库

```bash
git remote rename gitcode csdn
```

### 删除远程仓库

```bash
git remote remove gitcode
```

### 修改远程仓库 URL

```bash
git remote set-url gitcode https://new-url.git
```

## 🔧 使用令牌的方法

### 方法 1: 在 URL 中嵌入令牌（不推荐）

```bash
git remote set-url gitcode https://YOUR_TOKEN@gitcode.com/Tongkethon/KeyboardStatsTracker.git
```

⚠️ 不推荐：令牌会保存在配置文件中

### 方法 2: 使用凭据管理器（推荐）

Windows 的 Git Credential Manager 会自动保存你的凭据。

首次推送时输入令牌，之后会自动使用。

## 📊 工作流程示例

### 日常开发流程

```bash
# 1. 修改代码
# 2. 提交更改
git add .
git commit -m "你的提交信息"

# 3. 推送到 GitHub
git push origin main

# 4. 推送到 GitCode
git push gitcode main
```

### 一次性推送到所有平台

```bash
# 提交更改
git add .
git commit -m "你的提交信息"

# 推送到所有远程仓库
git remote | xargs -L1 git push
```

或者使用 PowerShell：

```powershell
git remote | ForEach-Object { git push $_ main }
```

## 🎯 快速命令参考

```bash
# 查看远程仓库
git remote -v

# 推送到 GitHub
git push origin main

# 推送到 GitCode
git push gitcode main

# 推送到所有远程仓库
git push --all

# 拉取 GitHub 的更新
git pull origin main

# 拉取 GitCode 的更新
git pull gitcode main
```

## ❓ 常见问题

### Q: 推送时提示认证失败？
A: 确保使用的是访问令牌而不是密码。

### Q: 如何更新已保存的凭据？
A: 
```bash
# Windows
git credential-manager-core erase
```

### Q: 两个平台的代码不同步怎么办？
A: 以一个为准，强制推送：
```bash
git push gitcode main --force
```

### Q: 如何设置默认推送到哪个平台？
A: `origin` 是默认的，`git push` 会推送到 origin。

## 🔗 相关链接

- GitCode 官网: https://gitcode.com
- GitCode 帮助文档: https://gitcode.com/help
- 你的 GitCode 仓库: https://gitcode.com/Tongkethon/KeyboardStatsTracker

---

## 🚀 现在开始

1. 访问 https://gitcode.com/-/profile/personal_access_tokens
2. 创建访问令牌
3. 运行 `git push gitcode main`
4. 输入用户名和令牌

**完成！** 🎉
