# 构建指南

## 开发环境

```bash
# 安装依赖
npm install

# 编译 TypeScript
npm run build

# 启动应用
npm start
```

## 测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch
```

## 打包

### Windows
```bash
npm run dist:win
```

输出文件位于 `release/` 目录：
- `Keyboard Stats Tracker Setup 1.0.0.exe` - 安装版
- `Keyboard Stats Tracker 1.0.0.exe` - 便携版

### macOS
```bash
npm run dist:mac
```

### Linux
```bash
npm run dist:linux
```

## 项目结构

```
src/
├── main/           # Electron 主进程
├── renderer/       # 渲染进程 (UI)
├── domain/         # 领域模型和服务
└── infrastructure/ # 基础设施层
```

## 技术栈

- Electron 28
- TypeScript 5
- SQLite 3
- Chart.js 4
- uiohook-napi (键盘监听)
- Jest + fast-check (测试)
