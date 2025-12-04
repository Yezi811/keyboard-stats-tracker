# 🎁 创建安装程序指南

## ⚠️ 重要提示

在创建安装程序前，必须先关闭所有运行中的应用实例！

### 关闭应用的方法

#### 方法1：通过托盘图标
1. 右键点击系统托盘中的应用图标
2. 选择"退出"

#### 方法2：通过任务管理器
1. 按 `Ctrl + Shift + Esc` 打开任务管理器
2. 找到 "Keyboard Stats Tracker" 进程
3. 右键 → 结束任务

#### 方法3：使用命令行
```bash
taskkill /F /IM "Keyboard Stats Tracker.exe"
```

---

## 📦 创建64位安装程序

### 步骤1：确保应用已关闭

```bash
# 检查是否有进程在运行
tasklist | findstr "Keyboard"

# 如果有，强制结束
taskkill /F /IM "Keyboard Stats Tracker.exe"
```

### 步骤2：清理旧文件（可选）

```bash
# 删除旧的打包文件
Remove-Item -Recurse -Force release
```

### 步骤3：编译代码

```bash
npm run build
```

### 步骤4：创建安装程序

```bash
# 创建64位安装程序
npx electron-builder --win --x64
```

### 步骤5：查看结果

安装程序位置：
```
release/Keyboard Stats Tracker Setup 1.0.0.exe
```

---

## 🎯 完整命令（一键执行）

创建文件 `create-installer.ps1`：

```powershell
# 创建安装程序的完整脚本

Write-Host "=== 创建 Keyboard Stats Tracker 安装程序 ===" -ForegroundColor Cyan
Write-Host ""

# 1. 检查并关闭运行中的实例
Write-Host "1. 检查运行中的实例..." -ForegroundColor Yellow
$processes = Get-Process | Where-Object {$_.ProcessName -like "*Keyboard*Stats*"}
if ($processes) {
    Write-Host "   发现运行中的实例，正在关闭..." -ForegroundColor Red
    $processes | Stop-Process -Force
    Start-Sleep -Seconds 2
    Write-Host "   ✓ 已关闭" -ForegroundColor Green
} else {
    Write-Host "   ✓ 没有运行中的实例" -ForegroundColor Green
}

# 2. 清理旧文件
Write-Host "2. 清理旧文件..." -ForegroundColor Yellow
if (Test-Path "release") {
    Remove-Item -Recurse -Force release -ErrorAction SilentlyContinue
    Write-Host "   ✓ 已清理" -ForegroundColor Green
} else {
    Write-Host "   ✓ 无需清理" -ForegroundColor Green
}

# 3. 编译代码
Write-Host "3. 编译代码..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ 编译成功" -ForegroundColor Green
} else {
    Write-Host "   ✗ 编译失败" -ForegroundColor Red
    exit 1
}

# 4. 创建安装程序
Write-Host "4. 创建安装程序..." -ForegroundColor Yellow
npx electron-builder --win --x64
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ 创建成功" -ForegroundColor Green
} else {
    Write-Host "   ✗ 创建失败" -ForegroundColor Red
    exit 1
}

# 5. 显示结果
Write-Host ""
Write-Host "=== 完成！===" -ForegroundColor Cyan
Write-Host ""
Write-Host "安装程序位置：" -ForegroundColor Green
Get-ChildItem "release\*.exe" | ForEach-Object {
    Write-Host "  📦 $($_.Name)" -ForegroundColor White
    Write-Host "     大小: $([math]::Round($_.Length / 1MB, 2)) MB" -ForegroundColor Gray
}
Write-Host ""
```

运行：
```powershell
.\create-installer.ps1
```

---

## 📋 安装程序配置

当前配置（在 `package.json` 中）：

```json
{
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "shortcutName": "Keyboard Stats Tracker"
  }
}
```

### 配置说明

- `oneClick: false` - 允许用户选择安装位置
- `allowToChangeInstallationDirectory: true` - 可以更改安装目录
- `createDesktopShortcut: true` - 创建桌面快捷方式
- `createStartMenuShortcut: true` - 创建开始菜单快捷方式

---

## 🎨 添加自定义图标（可选）

如果想要自定义图标：

### 步骤1：准备图标文件

- 格式：`.ico`
- 尺寸：256x256 像素
- 位置：`build/icon.ico`

### 步骤2：更新配置

在 `package.json` 中添加：

```json
{
  "win": {
    "icon": "build/icon.ico"
  }
}
```

### 步骤3：重新打包

```bash
npm run build
npx electron-builder --win --x64
```

---

## 🔍 故障排除

### 问题1：文件被占用

**错误信息**：
```
Access is denied
```

**解决方法**：
1. 关闭所有应用实例
2. 删除 `release` 文件夹
3. 重新打包

### 问题2：缺少图标文件

**错误信息**：
```
invalid icon file
```

**解决方法**：
1. 从配置中移除 `icon` 选项
2. 或准备正确的 `.ico` 文件

### 问题3：网络问题

**错误信息**：
```
dial tcp ... connectex
```

**解决方法**：
1. 使用代理
2. 或使用国内镜像

---

## 📦 安装程序特性

### 用户安装体验

1. **双击安装程序**
2. **选择安装位置**（默认：`C:\Program Files\Keyboard Stats Tracker`）
3. **选择快捷方式**：
   - 桌面快捷方式
   - 开始菜单快捷方式
4. **安装进度**
5. **完成安装**

### 安装后

- 开始菜单中有快捷方式
- 桌面上有快捷方式（如果选择）
- 可以从"添加或删除程序"卸载
- 支持静默安装（企业部署）

---

## 🚀 高级选项

### 创建便携版 + 安装程序

```bash
# 同时创建便携版和安装程序
npx electron-builder --win --x64 --dir
npx electron-builder --win --x64
```

### 静默安装参数

用户可以使用以下命令静默安装：

```bash
# 静默安装到默认位置
"Keyboard Stats Tracker Setup 1.0.0.exe" /S

# 静默安装到指定位置
"Keyboard Stats Tracker Setup 1.0.0.exe" /S /D=C:\MyApps\KeyboardStats
```

### 卸载

用户可以通过以下方式卸载：

1. **设置 → 应用 → 卸载**
2. **控制面板 → 程序和功能**
3. **运行卸载程序**：
   ```
   C:\Program Files\Keyboard Stats Tracker\Uninstall Keyboard Stats Tracker.exe
   ```

---

## ✅ 检查清单

打包前确认：

- [ ] 所有应用实例已关闭
- [ ] 代码已编译（`npm run build`）
- [ ] 版本号正确（`package.json` 中的 `version`）
- [ ] 配置正确（`package.json` 中的 `build` 部分）
- [ ] 网络连接正常（如需下载依赖）

打包后确认：

- [ ] 安装程序文件存在
- [ ] 文件大小合理（约 150-200 MB）
- [ ] 测试安装程序能正常运行
- [ ] 测试安装后的应用能正常启动

---

## 📝 分发安装程序

### 重命名（可选）

```powershell
# 重命名为更清晰的名称
Rename-Item "release\Keyboard Stats Tracker Setup 1.0.0.exe" "Keyboard-Stats-Tracker-v1.0.0-Windows-x64-Setup.exe"
```

### 分发

1. **上传到网盘**
2. **发布到 GitHub Releases**
3. **托管在自己的网站**
4. **通过邮件发送**

---

## 🎊 完成！

现在你有了一个专业的 Windows 安装程序！

用户只需：
1. 下载安装程序
2. 双击运行
3. 按照向导完成安装
4. 从开始菜单启动应用

享受你的成果吧！🚀
