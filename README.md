# 键盘统计追踪器 (Keyboard Stats Tracker)

一个跨平台的键盘使用统计应用程序，使用 Electron + TypeScript 构建。

## 功能特性

- 实时记录键盘敲击
- 按日/月/年统计分析
- 可视化图表展示
- 数据导出 (JSON/CSV)
- 数据备份与恢复

## 技术栈

- Electron
- TypeScript
- SQLite
- Chart.js
- iohook (全局键盘监听)
- Jest + fast-check (测试)

## 项目结构

```
src/
├── main/           # Electron 主进程
├── renderer/       # 渲染进程 (UI)
├── domain/         # 领域模型和服务
└── infrastructure/ # 基础设施层 (数据库、键盘监听)
```

## 安装

```bash
npm install
```

## 开发

```bash
npm run build
npm start
```

## 测试

```bash
npm test
```

## 构建和打包

### 快速开始

```bash
# 验证构建配置
npm run verify-build

# 编译 TypeScript
npm run build

# 创建当前平台的安装包
npm run dist
```

### 平台特定构建

```bash
npm run dist:win     # Windows NSIS 安装程序
npm run dist:mac     # macOS DMG 镜像
npm run dist:linux   # Linux AppImage 和 DEB 包
```

### 输出位置

所有构建产物位于 `release/` 目录：
- Windows: `Keyboard Stats Tracker Setup X.X.X.exe`
- macOS: `Keyboard Stats Tracker-X.X.X.dmg`
- Linux: `Keyboard Stats Tracker-X.X.X.AppImage` 和 `.deb`

### 详细文档

- 📖 [完整构建指南](BUILD.md) - 详细的构建和打包文档
- 🚀 [快速构建指南](QUICK_BUILD_GUIDE.md) - 快速参考
- 🎨 [图标指南](build/README.md) - 如何添加自定义图标

### 常见问题

**Windows 权限错误**: 如果遇到 `EPERM` 错误，请以管理员身份运行或关闭所有应用实例。

**缺少图标**: 应用会使用默认 Electron 图标。要使用自定义图标，请参阅 `build/README.md`。

**构建失败**: 运行 `npm run verify-build` 检查配置，或尝试重新安装依赖。
