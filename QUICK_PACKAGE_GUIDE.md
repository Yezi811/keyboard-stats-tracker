# 快速打包指南

## Windows 打包步骤

### 方法1：使用 npm 脚本（推荐）

```bash
# 1. 确保已构建
npm run build

# 2. 打包 Windows 版本
npm run package:win
```

生成的文件在 `release/win-unpacked` 文件夹中。

### 方法2：创建安装程序

```bash
npm run dist:win
```

生成的安装程序在 `release` 文件夹中：
- `Keyboard Stats Tracker Setup 1.0.0.exe`

### 如果遇到网络问题

如果打包时无法下载 Electron，可以：

1. **使用代理**：
```bash
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
npm run package:win
```

2. **手动下载 Electron**：
   - 访问：https://github.com/electron/electron/releases
   - 下载对应版本的 electron-v28.3.3-win32-x64.zip
   - 放到缓存目录：`%LOCALAPPDATA%\electron\Cache\`

3. **使用已安装的 Electron**：
```bash
npx electron-builder --win --x64 --dir
```

## 打包结果

打包成功后，你会在 `release` 文件夹中看到：

### 便携版（无需安装）
- `release/win-unpacked/Keyboard Stats Tracker.exe`
- 可以直接运行，或压缩成 ZIP 分发

### 安装程序
- `release/Keyboard Stats Tracker Setup 1.0.0.exe`
- 用户双击安装，会创建桌面快捷方式和开始菜单项

## 测试打包结果

1. 进入 `release/win-unpacked` 文件夹
2. 双击 `Keyboard Stats Tracker.exe`
3. 应用应该正常启动并运行

## 分发

### 便携版
1. 压缩 `release/win-unpacked` 文件夹
2. 重命名为 `Keyboard-Stats-Tracker-v1.0.0-portable.zip`
3. 分发给用户

### 安装程序
1. 直接分发 `Keyboard Stats Tracker Setup 1.0.0.exe`
2. 用户下载后双击安装即可

## 常见问题

### Q: 打包后文件很大？
A: 这是正常的，因为包含了 Electron 运行时和 Node.js。通常 Windows 版本约 150-200MB。

### Q: 杀毒软件报警？
A: 未签名的应用可能被标记。可以：
- 申请代码签名证书
- 或告知用户这是误报

### Q: 需要管理员权限？
A: 默认安装到用户目录，不需要管理员权限。

### Q: 如何更新版本号？
A: 修改 `package.json` 中的 `version` 字段，然后重新打包。

## 高级选项

### 只打包不创建安装程序
```bash
npx electron-builder --win --x64 --dir
```

### 同时打包 32 位和 64 位
```bash
npx electron-builder --win --ia32 --x64
```

### 创建便携版 ZIP
```bash
npx electron-builder --win --x64 --dir
cd release/win-unpacked
tar -a -c -f ../Keyboard-Stats-Tracker-portable.zip *
```

## 需要帮助？

查看完整文档：`PACKAGING_GUIDE.md`
