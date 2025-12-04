# 设计文档

## 概述

键盘统计追踪器是一个跨平台桌面应用程序，使用 Electron 框架构建，能够在 Windows、macOS 和 Linux 系统上运行。系统采用事件驱动架构，通过全局键盘钩子捕获按键事件，使用 SQLite 数据库进行数据持久化，并使用 Chart.js 库生成可视化图表。

技术栈：
- **前端**: HTML5, CSS3, TypeScript, Chart.js
- **后端**: Node.js, Electron
- **数据库**: SQLite
- **键盘监听**: iohook (跨平台全局键盘钩子)
- **图表库**: Chart.js

## 架构

系统采用分层架构设计：

```
┌─────────────────────────────────────┐
│      表示层 (Presentation)          │
│   UI Components + Chart Renderer    │
└─────────────────────────────────────┘
              ↓ ↑
┌─────────────────────────────────────┐
│      应用层 (Application)           │
│   Statistics Service + Export       │
└─────────────────────────────────────┘
              ↓ ↑
┌─────────────────────────────────────┐
│      领域层 (Domain)                │
│   Keystroke Aggregator + Models     │
└─────────────────────────────────────┘
              ↓ ↑
┌─────────────────────────────────────┐
│      基础设施层 (Infrastructure)     │
│   Keyboard Listener + DB Repository │
└─────────────────────────────────────┘
```

### 关键设计决策

1. **使用 Electron**: 提供跨平台支持和丰富的 UI 能力
2. **使用 iohook**: 提供可靠的全局键盘事件监听，无需管理员权限
3. **使用 SQLite**: 轻量级、无需配置、支持复杂查询
4. **事件驱动架构**: 解耦键盘监听和数据处理，提高系统响应性
5. **批量写入策略**: 每 5 秒或累积 100 个事件后批量写入数据库，减少 I/O 开销

## 组件和接口

### 1. KeyboardListener (键盘监听器)

**职责**: 捕获全局键盘事件并发布到事件总线

```typescript
interface KeyboardListener {
  start(): void;
  stop(): void;
  on(event: 'keystroke', handler: (key: KeystrokeEvent) => void): void;
}

interface KeystrokeEvent {
  keyCode: number;
  keyName: string;
  timestamp: number;
}
```

### 2. KeystrokeRepository (敲击数据仓库)

**职责**: 管理敲击数据的持久化存储

```typescript
interface KeystrokeRepository {
  save(keystrokes: Keystroke[]): Promise<void>;
  getByDateRange(start: Date, end: Date): Promise<Keystroke[]>;
  getStatsByPeriod(period: 'day' | 'month' | 'year', date: Date): Promise<KeyStats[]>;
  clear(): Promise<void>;
  backup(): Promise<string>;
  restore(backupPath: string): Promise<void>;
}

interface Keystroke {
  id?: number;
  keyCode: number;
  keyName: string;
  timestamp: number;
}

interface KeyStats {
  keyName: string;
  count: number;
}
```

### 3. StatisticsService (统计服务)

**职责**: 聚合和计算统计数据

```typescript
interface StatisticsService {
  getDailyStats(date: Date): Promise<DailyStats>;
  getMonthlyStats(year: number, month: number): Promise<MonthlyStats>;
  getYearlyStats(year: number): Promise<YearlyStats>;
  getTopKeys(period: 'day' | 'month' | 'year', date: Date, limit: number): Promise<KeyStats[]>;
}

interface DailyStats {
  date: Date;
  totalKeystrokes: number;
  keyBreakdown: KeyStats[];
}

interface MonthlyStats {
  year: number;
  month: number;
  totalKeystrokes: number;
  dailyTrend: { date: Date; count: number }[];
  keyBreakdown: KeyStats[];
}

interface YearlyStats {
  year: number;
  totalKeystrokes: number;
  monthlyTrend: { month: number; count: number }[];
  keyBreakdown: KeyStats[];
}
```

### 4. ChartRenderer (图表渲染器)

**职责**: 生成可视化图表

```typescript
interface ChartRenderer {
  renderBarChart(data: KeyStats[], container: HTMLElement): void;
  renderLineChart(data: TrendData[], container: HTMLElement): void;
  destroy(): void;
}

interface TrendData {
  label: string;
  value: number;
}
```

### 5. ExportService (导出服务)

**职责**: 导出统计数据

```typescript
interface ExportService {
  exportToJSON(data: Keystroke[], filePath: string): Promise<void>;
  exportToCSV(data: Keystroke[], filePath: string): Promise<void>;
}
```

### 6. UIController (UI 控制器)

**职责**: 协调用户交互和数据展示

```typescript
interface UIController {
  initialize(): void;
  onPeriodChange(period: 'day' | 'month' | 'year', date: Date): void;
  onExportRequest(format: 'json' | 'csv'): void;
  onResetRequest(): void;
  updateDisplay(stats: DailyStats | MonthlyStats | YearlyStats): void;
}
```

## 数据模型

### 数据库模式

```sql
-- 敲击记录表
CREATE TABLE keystrokes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_code INTEGER NOT NULL,
  key_name TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  date TEXT NOT NULL,  -- YYYY-MM-DD 格式，用于快速日期查询
  hour INTEGER NOT NULL -- 0-23，用于小时级统计
);

CREATE INDEX idx_timestamp ON keystrokes(timestamp);
CREATE INDEX idx_date ON keystrokes(date);
CREATE INDEX idx_key_name ON keystrokes(key_name);

-- 备份表
CREATE TABLE backups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  backup_path TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

### 内存缓冲区

为了提高性能，系统维护一个内存缓冲区：

```typescript
class KeystrokeBuffer {
  private buffer: Keystroke[] = [];
  private readonly maxSize = 100;
  private readonly flushInterval = 5000; // 5 秒
  
  add(keystroke: Keystroke): void;
  flush(): Promise<void>;
  size(): number;
}
```

## 正确性属性

*属性是系统在所有有效执行中应该保持为真的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*


### 属性 1: 按键捕获完整性
*对于任意*按键事件，当系统捕获该事件时，应该在数据存储中记录该按键的标识符和时间戳
**验证需求: 1.1, 1.4**

### 属性 2: 数据持久化往返
*对于任意*敲击数据集合，将其写入持久化存储然后读取，应该得到等价的数据
**验证需求: 2.1, 2.3**

### 属性 3: 数据持久性保证
*对于任意*已保存的敲击数据，在系统重启后，该数据应该仍然可以从存储中检索
**验证需求: 2.2**

### 属性 4: 日期范围过滤准确性
*对于任意*日期范围和敲击数据集，统计查询应该只返回时间戳在指定范围内的数据
**验证需求: 3.3, 4.3, 5.3**

### 属性 5: 统计聚合准确性
*对于任意*时间周期（日/月/年）和敲击数据，该周期的总敲击数应该等于所有按键计数的总和
**验证需求: 3.1, 3.2, 4.1, 4.2, 5.1, 5.2**

### 属性 6: 统计结果排序
*对于任意*统计结果，按键列表应该按敲击次数降序排列
**验证需求: 3.5**

### 属性 7: 趋势数据一致性
*对于任意*月度统计，所有每日趋势数据的总和应该等于月度总敲击数；对于任意年度统计，所有每月趋势数据的总和应该等于年度总敲击数
**验证需求: 4.4, 5.4**

### 属性 8: 图表类型正确性
*对于任意*统计周期，日统计应该生成柱状图，月统计和年统计应该生成折线图
**验证需求: 6.2, 6.3, 6.4**

### 属性 9: 图表数据完整性
*对于任意*统计数据，生成的图表应该包含所有数据点、坐标轴标签和图例
**验证需求: 6.1, 6.5**

### 属性 10: JSON 导出往返
*对于任意*敲击数据集合，导出为 JSON 然后解析，应该得到包含完整时间戳和按键信息的等价数据
**验证需求: 7.2**

### 属性 11: CSV 格式正确性
*对于任意*敲击数据集合，导出为 CSV 应该生成符合标准逗号分隔格式的文本，包含表头和所有数据行
**验证需求: 7.3**

### 属性 12: 导出范围过滤
*对于任意*时间范围，导出的数据应该只包含该范围内的敲击记录
**验证需求: 7.4**

### 属性 13: 按键识别准确性
*对于任意*按键码，系统应该将其正确映射到对应的按键类别（字母、数字、符号、功能键、修饰键、特殊键）和人类可读名称
**验证需求: 9.1, 9.2, 9.3**

### 属性 14: 组合键独立计数
*对于任意*组合键事件（如 Ctrl+C），系统应该分别增加每个按键的计数器
**验证需求: 9.4**

### 属性 15: 数据重置完整性
*对于任意*敲击数据集合，执行重置操作后，所有统计查询应该返回零计数
**验证需求: 10.2**

### 属性 16: 备份创建保证
*对于任意*重置操作，系统应该在清除数据前创建备份文件
**验证需求: 10.3**

### 属性 17: 备份恢复往返
*对于任意*敲击数据集合，重置后从备份恢复，应该得到原始数据
**验证需求: 10.5**

### 属性 18: 重置后计数重启
*对于任意*重置操作后的新敲击事件，计数应该从零开始累加
**验证需求: 10.4**

## 错误处理

### 错误类型和处理策略

1. **键盘监听失败**
   - 错误: 无法初始化全局键盘钩子
   - 处理: 显示错误对话框，提示用户检查权限，提供重试选项
   - 降级: 无降级方案，这是核心功能

2. **数据库连接失败**
   - 错误: 无法打开或创建 SQLite 数据库文件
   - 处理: 尝试使用备用路径，如果失败则使用内存数据库
   - 降级: 仅内存模式运行，数据不持久化，显示警告

3. **数据写入失败**
   - 错误: 磁盘空间不足或权限问题
   - 处理: 将数据保留在内存缓冲区，每 30 秒重试一次
   - 降级: 继续记录新数据，但可能丢失旧数据

4. **数据读取失败**
   - 错误: 数据库文件损坏
   - 处理: 尝试从最近的备份恢复
   - 降级: 如果恢复失败，创建新数据库，从零开始

5. **图表渲染失败**
   - 错误: Chart.js 初始化失败或数据格式错误
   - 处理: 显示错误消息，仅展示数值表格
   - 降级: 提供纯文本统计信息

6. **导出失败**
   - 错误: 文件写入权限问题
   - 处理: 提示用户选择其他保存位置
   - 降级: 将数据复制到剪贴板

### 错误日志

系统维护错误日志文件 `error.log`，记录所有错误和警告：

```typescript
interface ErrorLogger {
  logError(error: Error, context: string): void;
  logWarning(message: string, context: string): void;
  getRecentErrors(limit: number): LogEntry[];
}

interface LogEntry {
  timestamp: number;
  level: 'error' | 'warning';
  message: string;
  context: string;
  stack?: string;
}
```

## 测试策略

### 单元测试

使用 Jest 作为测试框架，重点测试：

1. **按键名称映射**: 验证常见按键码正确映射到名称
2. **日期边界处理**: 测试月末、年末等边界情况
3. **空数据处理**: 验证没有数据时返回零计数
4. **错误恢复**: 测试各种错误场景的处理逻辑

### 属性测试

使用 fast-check 作为属性测试库，配置每个测试运行至少 100 次迭代。

每个属性测试必须：
- 使用注释标记对应的设计文档属性: `// Feature: keyboard-stats-tracker, Property X: [属性描述]`
- 每个正确性属性由单个属性测试实现
- 使用智能生成器约束输入空间（例如：生成有效的日期范围、合理的按键码）

**测试生成器示例**:

```typescript
// 生成有效的按键码 (0-255)
const keyCodeArbitrary = fc.integer({ min: 0, max: 255 });

// 生成有效的日期范围
const dateRangeArbitrary = fc.tuple(
  fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
  fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
).map(([d1, d2]) => d1 <= d2 ? [d1, d2] : [d2, d1]);

// 生成敲击事件
const keystrokeArbitrary = fc.record({
  keyCode: keyCodeArbitrary,
  keyName: fc.string({ minLength: 1, maxLength: 20 }),
  timestamp: fc.integer({ min: 0, max: Date.now() })
});
```

### 集成测试

测试组件间交互：

1. **端到端流程**: 从按键捕获到数据存储到统计展示
2. **数据库操作**: 验证 SQLite 查询正确性
3. **UI 交互**: 使用 Spectron 测试 Electron 应用

### 性能测试

验证系统在高负载下的表现：

1. **高频按键**: 模拟每秒 100 次按键，验证无丢失
2. **大数据集**: 测试 100 万条记录的查询性能
3. **内存使用**: 监控长时间运行的内存泄漏

## 安全考虑

1. **权限管理**: 
   - 仅请求必要的键盘监听权限
   - 不记录密码输入（检测密码字段上下文）

2. **数据隐私**:
   - 所有数据存储在本地，不上传到服务器
   - 提供数据加密选项（可选功能）

3. **输入验证**:
   - 验证所有用户输入（日期选择、文件路径等）
   - 防止 SQL 注入（使用参数化查询）

## 性能优化

1. **批量写入**: 每 5 秒或 100 个事件批量写入数据库
2. **索引优化**: 在 timestamp、date、key_name 字段上创建索引
3. **查询缓存**: 缓存最近的统计查询结果（5 分钟过期）
4. **懒加载**: 图表数据按需加载，不预加载所有历史数据
5. **数据归档**: 提供选项归档 1 年前的数据到单独文件

## 部署和打包

使用 electron-builder 打包应用：

- **Windows**: NSIS 安装程序 (.exe)
- **macOS**: DMG 镜像 (.dmg)
- **Linux**: AppImage (.appimage) 和 Debian 包 (.deb)

应用大小目标: < 100 MB

## 未来扩展

1. **云同步**: 支持多设备数据同步
2. **热力图**: 显示键盘按键使用热力图
3. **自定义报告**: 用户自定义统计报告模板
4. **快捷键**: 支持快捷键快速查看统计
5. **主题**: 支持深色/浅色主题切换
