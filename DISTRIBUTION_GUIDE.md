# 📦 分发指南

## 如何将应用分发给其他人

### 方法1：便携版 ZIP 包（推荐）

这是最简单的分发方式，用户无需安装，解压即用。

#### 步骤：

1. **打包应用**（如果还没打包）：
   ```bash
   npm run build
   npx electron-builder --win --x64 --dir
   ```

2. **压缩文件夹**：
   - 进入 `release` 文件夹
   - 右键点击 `win-unpacked` 文件夹
   - 选择"发送到" → "压缩(zipped)文件夹"
   - 或使用 7-Zip/WinRAR 压缩

3. **重命名**：
   ```
   Keyboard-Stats-Tracker-v1.0.0-Windows-x64-Portable.zip
   ```

4. **分发**：
   - 通过网盘分享（百度网盘、阿里云盘等）
   - 通过邮件发送
   - 上传到 GitHub Releases
   - 放在自己的网站上

#### 用户使用方法：

```
1. 下载 ZIP 文件
2. 解压到任意文件夹
3. 双击 "Keyboard Stats Tracker.exe" 运行
4. 首次运行可能需要允许防火墙访问
```

---

### 方法2：创建安装程序（专业版）

如果需要更专业的分发方式，可以创建安装程序。

#### 前置准备：

1. **准备应用图标**（可选但推荐）：
   - 创建 256x256 像素的图标
   - 转换为 .ico 格式
   - 放到 `build/icon.ico`

2. **修改版本信息**（可选）：
   编辑 `package.json`：
   ```json
   {
     "version": "1.0.0",
     "description": "键盘统计追踪器 - 实时统计你的键盘使用情况",
     "author": "你的名字"
   }
   ```

#### 创建安装程序：

```bash
# 确保已编译
npm run build

# 创建安装程序
npm run dist:win
```

生成的文件：
- `release/Keyboard Stats Tracker Setup 1.0.0.exe` - 安装程序

#### 用户使用方法：

```
1. 下载安装程序
2. 双击运行
3. 选择安装位置
4. 完成安装
5. 从开始菜单或桌面快捷方式启动
```

---

### 方法3：GitHub Releases（开源项目）

如果你的项目是开源的，可以通过 GitHub 分发。

#### 步骤：

1. **创建 GitHub 仓库**（如果还没有）

2. **推送代码**：
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/你的用户名/keyboard-stats-tracker.git
   git push -u origin main
   ```

3. **创建 Release**：
   - 在 GitHub 仓库页面点击 "Releases"
   - 点击 "Create a new release"
   - 标签版本：`v1.0.0`
   - 标题：`Keyboard Stats Tracker v1.0.0`
   - 描述：添加功能说明和更新日志

4. **上传文件**：
   - 上传 ZIP 包
   - 或上传安装程序
   - 可以同时上传多个版本（32位、64位）

5. **发布**：
   - 点击 "Publish release"
   - 用户可以从 Releases 页面下载

---

## 📝 创建使用说明

为用户创建一个简单的使用说明：

### README_FOR_USERS.md

```markdown
# 键盘统计追踪器 使用说明

## 安装

### 便携版
1. 解压 ZIP 文件到任意文件夹
2. 双击 "Keyboard Stats Tracker.exe" 运行

### 安装程序版
1. 双击安装程序
2. 按照提示完成安装
3. 从开始菜单启动

## 功能

- ✅ 实时统计键盘按键次数
- ✅ 按日/月/年查看统计数据
- ✅ 可视化图表展示
- ✅ 导出数据（JSON/CSV）
- ✅ 系统托盘后台运行
- ✅ 开机自启动（可选）
- ✅ 数据备份与恢复

## 使用方法

1. **启动应用**：双击运行
2. **查看统计**：在主界面选择日期和周期
3. **导出数据**：点击"导出 JSON"或"导出 CSV"
4. **最小化到托盘**：点击最小化或关闭按钮
5. **退出应用**：右键托盘图标 → 退出

## 常见问题

### Q: 杀毒软件报警？
A: 这是误报。应用未签名，部分杀毒软件会警告。可以添加到白名单。

### Q: 如何开机自启动？
A: 右键托盘图标 → 勾选"开机自启动"

### Q: 数据存储在哪里？
A: 数据存储在用户目录：`%APPDATA%/keyboard-stats-tracker/`

### Q: 如何卸载？
A: 
- 便携版：直接删除文件夹
- 安装版：通过"添加或删除程序"卸载

## 系统要求

- Windows 7 或更高版本
- 64 位操作系统
- 约 200MB 磁盘空间

## 联系方式

- 问题反馈：[你的邮箱或 GitHub Issues]
- 项目主页：[GitHub 链接]
```

---

## 🎯 分发清单

准备分发前，请确认：

- [ ] 应用已测试，功能正常
- [ ] 已添加单实例锁定（防止多开）
- [ ] 已创建 ZIP 包或安装程序
- [ ] 已准备用户说明文档
- [ ] 文件命名清晰（包含版本号）
- [ ] 已测试在干净的 Windows 系统上运行

---

## 📊 分发渠道对比

| 渠道 | 优点 | 缺点 | 适合场景 |
|------|------|------|----------|
| **网盘分享** | 简单快速 | 需要注册账号 | 小范围分享 |
| **GitHub Releases** | 专业、永久 | 需要 GitHub 账号 | 开源项目 |
| **自建网站** | 完全控制 | 需要服务器 | 商业项目 |
| **邮件发送** | 直接送达 | 文件大小限制 | 一对一分享 |

---

## 🔐 安全提示

### 对于开发者：

1. **不要包含敏感信息**：
   - 检查代码中没有 API 密钥
   - 不要包含个人数据

2. **考虑代码签名**（可选）：
   - 申请代码签名证书（需要费用）
   - 避免杀毒软件误报

3. **提供校验和**（可选）：
   ```bash
   # 生成 SHA256 校验和
   certutil -hashfile "Keyboard-Stats-Tracker-v1.0.0.zip" SHA256
   ```

### 对于用户：

1. **从可信来源下载**
2. **首次运行可能需要允许防火墙**
3. **杀毒软件警告是正常的**（未签名应用）

---

## 📈 版本更新

当你发布新版本时：

1. **更新版本号**：
   ```json
   // package.json
   {
     "version": "1.1.0"
   }
   ```

2. **重新打包**：
   ```bash
   npm run build
   npx electron-builder --win --x64 --dir
   ```

3. **创建更新日志**：
   ```markdown
   ## v1.1.0 (2024-01-15)
   
   ### 新增
   - 添加单实例锁定功能
   
   ### 修复
   - 修复数字键映射错误
   - 修复按键重复记录问题
   
   ### 改进
   - 优化实时刷新性能
   ```

4. **通知用户**：
   - 在 GitHub Releases 发布
   - 或通过其他渠道通知

---

## 🎊 快速分发命令

```bash
# 1. 确保代码最新
npm run build

# 2. 打包应用
npx electron-builder --win --x64 --dir

# 3. 压缩文件（PowerShell）
Compress-Archive -Path "release\win-unpacked" -DestinationPath "Keyboard-Stats-Tracker-v1.0.0-Windows-x64-Portable.zip"

# 4. 完成！现在可以分享 ZIP 文件了
```

---

## 💡 专业建议

1. **版本命名规范**：
   - `v1.0.0` - 主版本.次版本.修订版本
   - 遵循语义化版本规范

2. **文件命名规范**：
   ```
   应用名称-版本号-平台-架构-类型.扩展名
   例如：Keyboard-Stats-Tracker-v1.0.0-Windows-x64-Portable.zip
   ```

3. **提供多个版本**：
   - 64 位版本（主要）
   - 32 位版本（兼容老系统）
   - 便携版 + 安装程序版

4. **保持更新**：
   - 定期修复 bug
   - 添加用户请求的功能
   - 保持与用户沟通

---

## 📞 需要帮助？

如果在分发过程中遇到问题：

1. 检查 `PACKAGING_GUIDE.md` - 详细打包说明
2. 检查 `QUICK_PACKAGE_GUIDE.md` - 快速打包指南
3. 检查 `PACKAGE_SUCCESS.md` - 打包成功后的说明

祝你分发顺利！🚀
