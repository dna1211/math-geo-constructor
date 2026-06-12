# 2026-06-12 UI 代码组织改进计划

## 背景

当前 `main.js` 文件有 804 行，包含所有 UI 逻辑（步骤面板、属性面板、工具栏、命令面板、快捷键等）。随着功能增加，维护成本会越来越高。

通过分析，决定：
- 状态管理：保持自定义 EventBus，做小改进
- UI 框架：保持原生 JS，改进代码组织
- CSS 方案：保持手写 CSS，拆分文件

## 改进目标

1. 拆分 `main.js` 为多个 UI 模块
2. 拆分 `style.css` 为多个样式文件
3. 改进 EventBus（添加事件常量、调试日志）
4. 更新 README 文档

## 文件结构变化

### 改进前

```
src/
├── main.js              # 804 行，所有 UI 逻辑
├── style.css            # 594 行，所有样式
└── ...
```

### 改进后

```
src/
├── main.js              # ~150 行，入口组装
├── ui/
│   ├── stepPanel.js     # 步骤面板逻辑
│   ├── propPanel.js     # 属性面板逻辑
│   ├── toolbar.js       # 工具栏逻辑
│   ├── commandPanel.js  # 命令面板逻辑
│   ├── shortcuts.js     # 快捷键逻辑
│   └── utils.js         # UI 工具函数
├── styles/
│   ├── variables.css    # 主题变量
│   ├── base.css         # 重置 + 基础
│   ├── layout.css       # 整体布局
│   ├── toolbar.css      # 工具栏
│   ├── properties.css   # 属性面板
│   ├── command.css      # 命令面板
│   ├── step.css         # 步骤面板
│   └── modal.css        # 弹窗
├── utils/
│   ├── eventBus.js      # 改进：添加事件常量
│   └── ...
└── ...
```

## 实施步骤

### 1. 改进 EventBus

**文件**: `src/utils/eventBus.js`

改进内容：
- 添加事件名称常量（`EVENTS` 对象）
- 添加开发环境调试日志
- 添加监听器数量检查（检测内存泄漏）

### 2. 拆分 style.css

**目录**: `src/styles/`

| 文件 | 内容 | 来源行数 |
|------|------|----------|
| variables.css | CSS 变量（主题） | ~36 行 |
| base.css | 重置 + 基础样式 | ~15 行 |
| layout.css | 整体布局 | ~20 行 |
| toolbar.css | 工具栏 | ~50 行 |
| properties.css | 属性面板 | ~100 行 |
| command.css | 命令面板 | ~80 行 |
| step.css | 步骤面板 | ~120 行 |
| modal.css | 弹窗 | ~110 行 |

### 3. 拆分 main.js

**目录**: `src/ui/`

| 文件 | 职责 | 函数 |
|------|------|------|
| stepPanel.js | 步骤面板 | `updateStepPanel`, `bindStepControls` |
| propPanel.js | 属性面板 | `updateProperties` |
| toolbar.js | 工具栏 | `updateToolButtons`, 工具栏事件 |
| commandPanel.js | 命令面板 | `executeCommand`, `autoComplete`, `commandHistory` |
| shortcuts.js | 快捷键 | 全局键盘快捷键 |
| utils.js | 工具函数 | `escapeHtml`, `ndcToWorld`, `getPickableObjects` |

### 4. 重构 main.js

精简为入口文件，只负责：
- 初始化各模块实例
- 调用各 UI 模块的绑定函数
- 启动应用

### 5. 更新 README

更新项目结构图和开发说明。

## 验证方式

1. 运行 `npm run dev` 确认应用正常启动
2. 测试所有功能：
   - 命令执行
   - 步骤面板操作
   - 属性面板编辑
   - 工具栏切换
   - 快捷键
   - 主题切换
3. 确认无控制台错误

## 预期收益

- `main.js` 从 804 行减少到 ~150 行
- 每个 UI 模块职责单一，易于维护
- CSS 文件按功能组织，便于查找和修改
- EventBus 更健壮，便于调试
