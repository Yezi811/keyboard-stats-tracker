# 📦 打包和命名规范指南

## 打包命令

### 64位版本（推荐）
```bash
# 打包 64 位便携版
npx electron-builder --win --x64 --dir

# 打包 64 位安装程序
npx electron-builder --win --x64
```

生成位置：
- 便携版：`release/win-unpacked/`
- 安装程序：`release/Keyboard Stats Tracker Setup 1.0.0.exe`

### 32位版本
```bash
# 打包 32 位便携版
npx electron-builder --win --ia32 --dir

# 打包 32 位安装程序
npx electron-builder --win --ia32
```

生成位置：
- 便携版：`release/win-ia32-unpacked/`
- 安装程序：`release/Keyboard Stats Tracker Setup 1.0.0-ia32.exe`

### 同时打包两个版本
```bash
# 同时打包 64 位和 32 位
npx electron-builder --win --x64 --ia32 --dir

# 或创建安装程序
npx electron-builder --win --x64 --ia32
```

---

## 📝 命名规范

### 格式
```
应用名称-版本号-平台-架构-类型.扩展名
```

### 64位版本命名

#### 便携版 ZIP
```
Keyboard-Stats-Tracker-v1.0.0-Windows-x64-Portable.zip
```

#### 安装程序
```
Keyboard-Stats-Tracker-v1.0.0-Windows-x64-Setup.exe
```

### 32位版本命名

#### 便携版 ZIP
```
Keyboard-Stats-Tracker-v1.0.0-Windows-ia32-Portable.zip
或
Keyboard-Stats-Tracker-v1.0.0-Windows-x86-Portable.zip
```

#### 安装程序
```
Keyboard-Stats-Tracker-v1.0.0-Windows-ia32-Setup.exe
或
Keyboard-Stats-Tracker-v1.0.0-Windows-x86-Setup.exe
```

### 通用版本命名（包含两个架构）

如果你打包了一个同时支持 32 位和 64 位的安装程序：
```
Keyboard-Stats-Tracker-v1.0.0-Windows-Setup.exe
```

---

## 🎯 完整打包流程

### 步骤1：准备

```bash
# 确保代码已编译
npm run build
```

### 步骤2：打包 64 位版本

```bash
# 打包 64 位
npx electron-builder --win --x64 --dir
```

### 步骤3：压缩 64 位版本

**PowerShell 命令**：
```powershell
Compress-Archive -Path "release\win-unpacked" -DestinationPath "Keyboard-Stats-Tracker-v1.0.0-Windows-x64-Portable.zip" -Force
```

**或手动操作**：
1. 进入 `release` 文件夹
2. 右键 `win-unpacked` 文件夹
3. 发送到 → 压缩(zipped)文件夹
4. 重命名为：`Keyboard-Stats-Tracker-v1.0.0-Windows-x64-Portable.zip`

### 步骤4：打包 32 位版本

```bash
# 打包 32 位
npx electron-builder --win --ia32 --dir
```

### 步骤5：压缩 32 位版本

**PowerShell 命令**：
```powershell
Compress-Archive -Path "release\win-ia32-unpacked" -DestinationPath "Keyboard-Stats-Tracker-v1.0.0-Windows-ia32-Portable.zip" -Force
```

**或手动操作**：
1. 进入 `release` 文件夹
2. 右键 `win-ia32-unpacked` 文件夹
3. 发送到 → 压缩(zipped)文件夹
4. 重命名为：`Keyboard-Stats-Tracker-v1.0.0-Windows-ia32-Portable.zip`

---

## 📊 架构说明

### x64 (64位)
- **适用系统**：Windows 7/8/10/11 (64位)
- **推荐使用**：现代电脑（2010年后）
- **优点**：性能更好，支持更大内存
- **文件名标识**：`x64` 或 `amd64`

### ia32 (32位)
- **适用系统**：Windows 7/8/10/11 (32位和64位都可以)
- **推荐使用**：老旧电脑（2010年前）
- **优点**：兼容性更好
- **文件名标识**：`ia32`、`x86` 或 `win32`

### 如何选择？

**推荐策略**：
1. **主要分发 64 位版本**（覆盖 95% 用户）
2. **可选提供 32 位版本**（兼容老系统）

**用户如何选择**：
- 不确定？选择 64 位版本
- 系统是 32 位？选择 32 位版本
- 电脑很老？选择 32 位版本

---

## 📁 文件组织

### 推荐的发布文件结构

```
releases/
├── v1.0.0/
│   ├── Keyboard-Stats-Tracker-v1.0.0-Windows-x64-Portable.zip
│   ├── Keyboard-Stats-Tracker-v1.0.0-Windows-ia32-Portable.zip
│   ├── Keyboard-Stats-Tracker-v1.0.0-Windows-x64-Setup.exe
│   ├── Keyboard-Stats-Tracker-v1.0.0-Windows-ia32-Setup.exe
│   ├── USER_GUIDE.md
│   ├── README.md
│   └── CHANGELOG.md
```

### 最小发布（只发布 64 位）

```
releases/
├── v1.0.0/
│   ├── Keyboard-Stats-Tracker-v1.0.0-Windows-x64-Portable.zip
│   ├── USER_GUIDE.md
│   └── README.md
```

---

## 🏷️ 命名变体

### 简化版命名（适合个人使用）

```
# 64 位
KeyboardStats-v1.0.0-x64.zip

# 32 位
KeyboardStats-v1.0.0-x86.zip
```

### 详细版命名（适合正式发布）

```
# 64 位
Keyboard-Stats-Tracker-v1.0.0-Windows-x64-Portable.zip

# 32 位
Keyboard-Stats-Tracker-v1.0.0-Windows-ia32-Portable.zip
```

### 中文命名（适合国内用户）

```
# 64 位
键盘统计追踪器-v1.0.0-Windows-64位-便携版.zip

# 32 位
键盘统计追踪器-v1.0.0-Windows-32位-便携版.zip
```

---

## 🔢 版本号规范

遵循语义化版本（Semantic Versioning）：

```
主版本号.次版本号.修订号

例如：1.0.0
```

### 版本号含义

- **主版本号**（Major）：重大更新，可能不兼容
  - 例如：1.0.0 → 2.0.0

- **次版本号**（Minor）：新功能，向后兼容
  - 例如：1.0.0 → 1.1.0

- **修订号**（Patch）：Bug 修复，向后兼容
  - 例如：1.0.0 → 1.0.1

### 版本号示例

```
v1.0.0 - 首次发布
v1.0.1 - 修复按键映射错误
v1.1.0 - 添加单实例锁定功能
v2.0.0 - 重大架构更新
```

---

## 📋 快速命令参考

### 一键打包脚本（PowerShell）

创建文件 `package-all.ps1`：

```powershell
# 打包所有版本的脚本

Write-Host "开始打包..." -ForegroundColor Green

# 1. 编译
Write-Host "1. 编译代码..." -ForegroundColor Yellow
npm run build

# 2. 打包 64 位
Write-Host "2. 打包 64 位版本..." -ForegroundColor Yellow
npx electron-builder --win --x64 --dir

# 3. 压缩 64 位
Write-Host "3. 压缩 64 位版本..." -ForegroundColor Yellow
Compress-Archive -Path "release\win-unpacked" -DestinationPath "Keyboard-Stats-Tracker-v1.0.0-Windows-x64-Portable.zip" -Force

# 4. 打包 32 位
Write-Host "4. 打包 32 位版本..." -ForegroundColor Yellow
npx electron-builder --win --ia32 --dir

# 5. 压缩 32 位
Write-Host "5. 压缩 32 位版本..." -ForegroundColor Yellow
Compress-Archive -Path "release\win-ia32-unpacked" -DestinationPath "Keyboard-Stats-Tracker-v1.0.0-Windows-ia32-Portable.zip" -Force

Write-Host "打包完成！" -ForegroundColor Green
Write-Host "文件位置：" -ForegroundColor Cyan
Write-Host "  - Keyboard-Stats-Tracker-v1.0.0-Windows-x64-Portable.zip" -ForegroundColor White
Write-Host "  - Keyboard-Stats-Tracker-v1.0.0-Windows-ia32-Portable.zip" -ForegroundColor White
```

运行：
```powershell
.\package-all.ps1
```

---

## 📦 分发建议

### 方案1：只分发 64 位（推荐）

**优点**：
- 简单
- 文件少
- 覆盖大部分用户

**文件**：
```
Keyboard-Stats-Tracker-v1.0.0-Windows-x64-Portable.zip
```

### 方案2：同时分发两个版本

**优点**：
- 兼容性最好
- 覆盖所有用户

**文件**：
```
Keyboard-Stats-Tracker-v1.0.0-Windows-x64-Portable.zip
Keyboard-Stats-Tracker-v1.0.0-Windows-ia32-Portable.zip
```

### 方案3：创建通用安装程序

**优点**：
- 一个文件
- 自动检测系统架构

**文件**：
```
Keyboard-Stats-Tracker-v1.0.0-Windows-Setup.exe
```

---

## 💡 最佳实践

1. **文件名要清晰**：
   - 包含版本号
   - 包含架构信息
   - 包含类型（便携版/安装程序）

2. **提供 README**：
   - 说明如何选择版本
   - 系统要求
   - 安装步骤

3. **提供校验和**（可选）：
   ```bash
   certutil -hashfile "Keyboard-Stats-Tracker-v1.0.0-Windows-x64-Portable.zip" SHA256
   ```

4. **保持一致性**：
   - 所有版本使用相同的命名格式
   - 版本号保持同步

---

## 🎯 推荐配置

### 对于大多数用户

**只打包 64 位版本**：
```bash
npm run build
npx electron-builder --win --x64 --dir
```

命名：
```
Keyboard-Stats-Tracker-v1.0.0-Windows-x64-Portable.zip
```

### 对于需要兼容性的场景

**打包两个版本**：
```bash
npm run build
npx electron-builder --win --x64 --ia32 --dir
```

命名：
```
Keyboard-Stats-Tracker-v1.0.0-Windows-x64-Portable.zip
Keyboard-Stats-Tracker-v1.0.0-Windows-ia32-Portable.zip
```

---

## 📞 需要帮助？

如果不确定如何选择：
- 个人使用：只打包 64 位
- 公开发布：打包两个版本
- 企业部署：咨询 IT 部门

祝打包顺利！🚀
