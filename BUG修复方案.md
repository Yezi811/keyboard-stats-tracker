# Bug 修复方案

## 问题 1: 开机自启动不稳定

### 问题分析
当前使用 `app.setLoginItemSettings({ openAtLogin: true })` 设置开机自启，但这个方法在某些情况下不可靠。

### 解决方案
1. 添加更多参数确保稳定性
2. 添加路径参数
3. 添加启动参数以区分开机启动和手动启动

### 修复代码
```typescript
app.setLoginItemSettings({
  openAtLogin: menuItem.checked,
  path: process.execPath,
  args: ['--autostart']
});
```

---

## 问题 2: 启动时不显示当前日期数据

### 问题分析
UIController 初始化时设置了 `this.currentDate = new Date()`，但 `datePicker.valueAsDate` 可能没有正确设置，导致显示的是上次的日期。

### 解决方案
1. 确保 datePicker 初始化为今天
2. 在 `initialize()` 方法中强制刷新到今天的数据

### 修复代码
```typescript
// 在 initialize() 方法中
this.currentDate = new Date();
this.datePicker.valueAsDate = this.currentDate;
// 强制加载今天的数据
this.onPeriodChange(this.currentPeriod, this.currentDate);
```

---

## 问题 3: 需要管理员权限才能监听某些应用

### 问题分析
uiohook-napi 在监听某些应用（特别是游戏）时需要管理员权限。当前应用以普通权限运行，无法监听这些应用的键盘输入。

### 解决方案
1. 在 package.json 中配置应用请求管理员权限
2. 添加 Windows UAC 提示
3. 在安装时设置快捷方式以管理员身份运行

### 修复步骤

#### 1. 修改 package.json
添加 `requestedExecutionLevel` 配置：

```json
"win": {
  "target": [...],
  "icon": "build/tray-icon.ico",
  "requestedExecutionLevel": "requireAdministrator"
}
```

#### 2. 创建 app.manifest 文件
在 build 文件夹创建 `app.manifest`：

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
  <trustInfo xmlns="urn:schemas-microsoft-com:asm.v3">
    <security>
      <requestedPrivileges>
        <requestedExecutionLevel level="requireAdministrator" uiAccess="false"/>
      </requestedPrivileges>
    </security>
  </trustInfo>
</assembly>
```

#### 3. 在 main.ts 中添加权限检查
```typescript
function checkAdminPrivileges(): boolean {
  if (process.platform === 'win32') {
    try {
      // 尝试写入需要管理员权限的位置
      const testPath = path.join(process.env.WINDIR || 'C:\\Windows', 'test.txt');
      require('fs').writeFileSync(testPath, 'test');
      require('fs').unlinkSync(testPath);
      return true;
    } catch {
      return false;
    }
  }
  return true;
}
```

---

## 实施优先级

1. **问题 2（最简单）**: 修改 UIController.ts
2. **问题 1（中等）**: 修改 main.ts 中的开机自启逻辑
3. **问题 3（最复杂）**: 修改 package.json 和添加 manifest 文件

---

## 测试计划

### 问题 1 测试
1. 启用开机自启动
2. 重启电脑
3. 验证应用是否自动启动
4. 重复测试 3 次确保稳定性

### 问题 2 测试
1. 打开应用
2. 切换到不同日期
3. 关闭应用
4. 重新打开应用
5. 验证是否显示今天的数据

### 问题 3 测试
1. 以普通用户身份运行应用
2. 打开游戏（如 Steam 游戏）
3. 按键盘
4. 验证是否能统计到按键
5. 检查是否有 UAC 提示
