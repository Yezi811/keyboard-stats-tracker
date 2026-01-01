 # 快速上传到 GitHub 指南

## ✅ 已完成

- [x] 初始化 git 仓库
- [x] 添加所有文件
- [x] 创建初始提交

## 📋 接下来的步骤

### 步骤 1: 在 GitHub 创建仓库

1. 打开浏览器，访问: https://github.com/new

2. 填写仓库信息:
   ```
   Repository name: keyboard-stats-tracker
   Description: 一个跨平台的键盘使用统计应用程序 | A cross-platform keyboard statistics tracker
   ```

3. 选择 **Public** 或 **Private**

4. **重要**: 不要勾选任何初始化选项（README, .gitignore, license）

5. 点击 **"Create repository"**

### 步骤 2: 连接并推送代码

创建仓库后，GitHub 会显示一些命令。**复制你的 GitHub 用户名**，然后在命令行中运行：

#### 方法 1: 使用批处理脚本（推荐）

```bash
# 直接运行这个脚本，它会引导你完成整个过程
.\UPLOAD_TO_GITHUB.bat
```

#### 方法 2: 手动执行命令

**替换 `YOUR_USERNAME` 为你的 GitHub 用户名**：

```bash
# 1. 添加远程仓库
git remote add origin https://github.com/YOUR_USERNAME/keyboard-stats-tracker.git

# 2. 重命名分支为 main
git branch -M main

# 3. 推送到 GitHub
git push -u origin main
```

### 步骤 3: 认证

推送时，你需要提供认证信息：

#### 选项 A: Personal Access Token（推荐）

1. 访问: https://github.com/settings/tokens
2. 点击 "Generate new token" → "Generate new token (classic)"
3. 设置:
   - Note: `keyboard-stats-tracker`
   - Expiration: 选择一个期限
   - 勾选: `repo` (完整的仓库访问权限)
4. 点击 "Generate token"
5. **复制 token**（只显示一次！）
6. 推送时使用 token 作为密码

#### 选项 B: SSH（如果已配置）

```bash
# 使用 SSH URL
git remote set-url origin git@github.com:YOUR_USERNAME/keyboard-stats-tracker.git
git push -u origin main
```

## 🎉 完成！

推送成功后，访问你的仓库:
```
https://github.com/YOUR_USERNAME/keyboard-stats-tracker
```

## 📦 创建 Release（可选但推荐）

1. 在仓库页面，点击 **"Releases"** → **"Create a new release"**

2. 填写信息:
   ```
   Tag: v1.0.0
   Release title: 键盘统计追踪器 v1.0.0
   ```

3. 在描述中粘贴 `FINAL_RELEASE.md` 的内容

4. 上传文件:
   - 拖拽 `release-package/Keyboard Stats Tracker Setup 1.0.0.exe`
   - 拖拽 `release-package/Keyboard Stats Tracker 1.0.0.exe`

5. 点击 **"Publish release"**

## 🏷️ 添加 Topics

在仓库页面，点击设置图标（齿轮），添加 topics:
- `electron`
- `typescript`
- `keyboard`
- `statistics`
- `windows`
- `desktop-app`

## 📝 后续更新

当你修改代码后:

```bash
git add .
git commit -m "描述你的更改"
git push
```

## ❓ 常见问题

### Q: 推送时提示 "remote origin already exists"
```bash
git remote set-url origin https://github.com/YOUR_USERNAME/keyboard-stats-tracker.git
```

### Q: 认证失败
- 确保使用 Personal Access Token 而不是密码
- 或配置 SSH 密钥

### Q: 推送被拒绝
```bash
git pull origin main --rebase
git push
```

---

## 🚀 快速命令参考

假设你的 GitHub 用户名是 `zhangsan`:

```bash
# 一次性完成所有操作
git remote add origin https://github.com/zhangsan/keyboard-stats-tracker.git
git branch -M main
git push -u origin main
```

**现在就开始吧！** 🎯
