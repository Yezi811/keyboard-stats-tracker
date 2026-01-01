# 获取 GitHub Personal Access Token 指南

## 什么是 Personal Access Token？

Personal Access Token (PAT) 是 GitHub 的个人访问令牌，用于替代密码进行身份验证。从 2021 年 8 月开始，GitHub 不再支持使用密码进行 Git 操作，必须使用 PAT。

## 📝 创建步骤

### 步骤 1: 登录 GitHub

访问 https://github.com 并登录你的账号

### 步骤 2: 进入设置页面

**方法 1: 直接访问**
```
https://github.com/settings/tokens
```

**方法 2: 通过菜单导航**
1. 点击右上角的头像
2. 选择 **Settings**（设置）
3. 在左侧菜单中，滚动到底部
4. 点击 **Developer settings**（开发者设置）
5. 点击 **Personal access tokens**
6. 选择 **Tokens (classic)**

### 步骤 3: 生成新令牌

1. 点击 **Generate new token** 按钮
2. 选择 **Generate new token (classic)**

### 步骤 4: 配置令牌

#### Note（备注）
```
keyboard-stats-tracker
```
或者任何你想要的名称，用于识别这个令牌的用途

#### Expiration（过期时间）
选择令牌的有效期：
- **30 days** - 30天（推荐用于临时项目）
- **60 days** - 60天
- **90 days** - 90天
- **No expiration** - 永不过期（不推荐，安全风险）

推荐选择 **90 days** 或更短的时间

#### Select scopes（选择权限范围）

**必须勾选的权限**：
- ✅ **repo** - 完整的仓库访问权限
  - 这会自动勾选所有子选项
  - 包括：repo:status, repo_deployment, public_repo, repo:invite, security_events

**可选权限**（根据需要）：
- ✅ **workflow** - 如果你使用 GitHub Actions
- ✅ **write:packages** - 如果你发布包到 GitHub Packages
- ✅ **delete:packages** - 如果需要删除包

**对于基本的 git 操作，只需要勾选 `repo` 即可。**

### 步骤 5: 生成令牌

1. 滚动到页面底部
2. 点击绿色的 **Generate token** 按钮

### 步骤 6: 复制令牌

⚠️ **重要提示**：
- 令牌只会显示**一次**！
- 立即复制并保存到安全的地方
- 如果丢失，需要重新生成新的令牌

令牌格式类似：
```
ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 💻 使用令牌

### 方法 1: 在 Git 命令中使用

当 Git 提示输入密码时：
- **Username**: 你的 GitHub 用户名（Yezi811）
- **Password**: 粘贴你的 Personal Access Token（不是你的 GitHub 密码）

### 方法 2: 在 URL 中嵌入（不推荐）

```bash
git remote set-url origin https://YOUR_TOKEN@github.com/Yezi811/keyboard-stats-tracker.git
```

⚠️ 不推荐这种方法，因为令牌会被保存在 git 配置中

### 方法 3: 使用 Git Credential Manager（推荐）

Windows 用户通常已经安装了 Git Credential Manager，它会自动保存你的令牌。

首次使用时：
```bash
git push
```
- 输入用户名：Yezi811
- 输入密码：粘贴你的 PAT

之后 Git 会自动记住你的凭据。

## 🔒 安全建议

1. **不要分享令牌** - 令牌等同于密码，不要公开或分享
2. **定期更新** - 设置过期时间，定期更新令牌
3. **最小权限原则** - 只授予必要的权限
4. **撤销不用的令牌** - 在 https://github.com/settings/tokens 可以撤销旧令牌
5. **不要提交到代码** - 永远不要把令牌写入代码或配置文件

## 🔄 更新或撤销令牌

### 查看现有令牌
访问：https://github.com/settings/tokens

### 撤销令牌
1. 找到要撤销的令牌
2. 点击 **Delete** 按钮
3. 确认删除

### 更新令牌
1. 撤销旧令牌
2. 创建新令牌
3. 在本地更新凭据

## ❓ 常见问题

### Q: 忘记保存令牌怎么办？
A: 只能重新生成新的令牌，旧令牌无法再次查看。

### Q: 令牌过期了怎么办？
A: 生成新的令牌，然后在下次 git 操作时使用新令牌。

### Q: 如何在多台电脑上使用？
A: 可以为每台电脑生成不同的令牌，便于管理和撤销。

### Q: 推送时还是提示密码错误？
A: 确保：
1. 使用的是 PAT 而不是 GitHub 密码
2. PAT 有 `repo` 权限
3. PAT 没有过期
4. 清除旧的凭据缓存

清除 Windows 凭据：
```bash
git credential-manager-core erase
```

## 📚 相关链接

- GitHub PAT 文档: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token
- Git Credential Manager: https://github.com/GitCredentialManager/git-credential-manager

---

**现在就去创建你的 Personal Access Token 吧！** 🔑

直接访问: https://github.com/settings/tokens/new
