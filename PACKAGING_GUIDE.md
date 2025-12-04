# 打包指南

本指南说明如何将键盘统计追踪器打包为可分发的应用程序。

## 前置要求

1. **Node.js** 已安装（v16 或更高版本）
2. **npm** 已安装
3. 所有依赖已安装：`npm install`

## 打包步骤

### 1. 准备应用图标（可选）

将应用图标放在 `build` 文件夹中：

- **Windows**: `build/icon.ico` (256x256 像素)
- **macOS**: `build/icon.icns` (512x512 像素)
- **Linux**: `build/icon.png` (512x512 像素)

如果没有图标，将使用默认的 Electron 图标。

### 2. 构建应用

```bash
npm run build
```

这会编译 TypeScript 代码并复制资源文件到 `dist` 文件夹。

### 3. 打包应用

#### Windows 打包

```bash
npm run package:win
```

或者

```bash
npm run dist:win
```

生成的文件位于 `release` 文件夹：
- `Keyboard Stats Tracker Setup x.x.x.exe` - 安装程序
- `Keyboard Stats Tracker x.x.x.exe` - 便携版（在 win-unpacked 文件夹中）

#### macOS 打包

```bash
npm run dist:mac
```

生成的文件：
- `Keyboard Stats Tracker-x.x.x.dmg` - macOS 安装镜像
- `Keyboard Stats Tracker-x.x.x-mac.zip` - 压缩包

#### Linux 打包

```bash
npm run dist:linux
```

生成的文件：
- `Keyboard Stats Tracker-x.x.x.AppImage` - AppImage 格式
- `keyboard-stats-tracker_x.x.x_amd64.deb` - Debian 包

#### 打包所有平台

```bash
npm run dist
```

## 打包配置

打包配置在 `package.json` 的 `build` 部分：

```json
{
  "build": {
    "appId": "com.keyboardstats.tracker",
    "productName": "Keyboard Stats Tracker",
    "directories": {
      "output": "release",
      "buildResources": "build"
    },
    "files": [
      "dist/**/*",
      "assets/**/*",
      "node_modules/**/*",
      "package.json"
    ]
  }
}
```

## 测试打包结果

### Windows

1. 运行安装程序：`release/Keyboard Stats Tracker Setup x.x.x.exe`
2. 或直接运行便携版：`release/win-unpacked/Keyboard Stats Tracker.exe`

### macOS

1. 打开 DMG 文件
2. 将应用拖到 Applications 文件夹
3. 从 Launchpad 或 Applications 文件夹启动

### Linux

1. 给 AppImage 添加执行权限：`chmod +x Keyboard-Stats-Tracker-x.x.x.AppImage`
2. 运行：`./Keyboard-Stats-Tracker-x.x.x.AppImage`

或安装 deb 包：
```bash
sudo dpkg -i keyboard-stats-tracker_x.x.x_amd64.deb
```

## 常见问题

### 1. 打包失败：找不到 electron-builder

```bash
npm install electron-builder --save-dev
```

### 2. Windows 打包需要管理员权限

某些杀毒软件可能会阻止打包过程。临时禁用杀毒软件或添加项目文件夹到白名单。

### 3. macOS 需要代码签名

如果要分发给其他用户，需要 Apple Developer 账号进行代码签名。

### 4. 打包文件太大

可以在 `package.json` 中配置 `files` 字段，只包含必要的文件。

## 分发

打包完成后，可以通过以下方式分发：

1. **直接分发**：将 `release` 文件夹中的安装程序发送给用户
2. **GitHub Releases**：上传到 GitHub 仓库的 Releases 页面
3. **网站下载**：托管在自己的网站上
4. **应用商店**：提交到 Microsoft Store、Mac App Store 等

## 自动化打包

可以使用 GitHub Actions 自动化打包流程。创建 `.github/workflows/build.yml`：

```yaml
name: Build

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - run: npm install
      - run: npm run dist
      
      - uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.os }}-build
          path: release/*
```

## 更新版本

更新 `package.json` 中的 `version` 字段，然后重新打包：

```json
{
  "version": "1.0.1"
}
```

## 支持

如有问题，请查看：
- [electron-builder 文档](https://www.electron.build/)
- [Electron 文档](https://www.electronjs.org/docs)
