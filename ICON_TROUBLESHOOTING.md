# 图标显示问题排查

## 问题
`release\win-unpacked\Keyboard Stats Tracker.exe` 的图标没有使用自定义的 ICO 文件。

## 可能的原因

### 1. ICO 文件格式不完整
当前 `build/tray-icon.ico` 文件大小为 12KB，可能只包含少数尺寸。

**解决方案：**
重新生成包含多个尺寸的 ICO 文件：
- 访问 https://www.icoconverter.com/
- 上传你的原始图片（PNG 格式，512x512 或更大）
- 勾选所有尺寸：16x16, 32x32, 48x48, 64x64, 128x128, 256x256
- 下载生成的 ICO 文件
- 替换 `build/tray-icon.ico`
- 重新运行 `npm run build && npx electron-builder --win --x64`

### 2. Windows 图标缓存
Windows 会缓存图标，即使更新了 EXE 文件，显示的仍是旧图标。

**解决方案：**
清除 Windows 图标缓存：

```powershell
# 方法 1：删除图标缓存文件
taskkill /f /im explorer.exe
del /a /q "%localappdata%\IconCache.db"
del /a /f /q "%localappdata%\Microsoft\Windows\Explorer\iconcache*"
start explorer.exe

# 方法 2：使用命令行工具
ie4uinit.exe -show
```

或者：
1. 重启电脑
2. 或将 EXE 文件复制到新位置查看

### 3. electron-builder 缓存
electron-builder 可能使用了缓存的图标。

**解决方案：**
```bash
# 清除 electron-builder 缓存
npx electron-builder clean

# 删除 release 目录
Remove-Item -Recurse -Force release

# 重新打包
npm run build
npx electron-builder --win --x64
```

## 验证图标是否正确嵌入

使用 ResourceHacker 或类似工具查看 EXE 文件的资源：
1. 下载 Resource Hacker: http://www.angusj.com/resourcehacker/
2. 打开 `Keyboard Stats Tracker.exe`
3. 查看 Icon Group 资源
4. 确认是否包含你的自定义图标

## 当前配置

package.json 中的图标配置：
```json
"win": {
  "icon": "build/tray-icon.ico"
}
```

这个配置是正确的。如果图标仍然不对，问题在于 ICO 文件本身或 Windows 缓存。
