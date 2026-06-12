# 解题步骤功能设计方案

## 1. 功能概述

### 1.1 需求描述
添加解题步骤功能，让辅助线等几何元素可以一步一步清晰展示，而不是一次性画出来。

### 1.2 核心价值
- 几何证明过程的可视化演示
- 教学场景下的逐步讲解
- 复杂构造过程的分步展示

---

## 2. 设计决策

| 决策点 | 方案 | 说明 |
|--------|------|------|
| 步骤分隔语法 | `---step 名称---` | 在命令序列中标记步骤 |
| 步骤内执行 | 一次性全部执行 | 步骤是逻辑单元，内部命令相互依赖 |
| 可见性策略 | 显示当前及之前所有步骤的对象 | 保持几何构造的完整性 |
| 动画效果 | 淡入淡出（500ms） | 平滑的视觉过渡 |
| 执行顺序 | 严格按顺序，不支持跳转 | 保证依赖关系正确 |
| 自动播放 | 不需要 | 用户手动控制节奏 |
| 步骤编辑 | 不需要 | 保持功能简洁 |

---

## 3. 语法规范

### 3.1 基本格式
```
---step 步骤名称---
```

### 3.2 示例
```
A = Point(0, 0, 0)
B = Point(3, 0, 0)
---step 基础点---
Segment(A, B)
---step 连线---
C = Point(1.5, 2, 0)
Triangle(A, B, C)
```

### 3.3 解析规则
- 开头的未标记命令 → 归入"准备"步骤
- `---step---` 必须独占一行
- 步骤名称支持中文、英文、数字、空格
- 连续多个 `---step---` → 合并为空步骤或忽略
- `---step---` 后无命令 → 跳过该步骤

---

## 4. 数据结构

### 4.1 步骤定义
```javascript
class Step {
  id: number              // 唯一标识（从0开始）
  name: string            // 步骤名称
  commands: string[]      // 原始命令列表
  objectNames: string[]   // 本步骤创建的对象名称
  state: 'pending' | 'executed' | 'current'
}
```

### 4.2 对象扩展
```javascript
// 在现有对象结构中增加 stepId
{
  name: "seg1",
  type: "segment",
  stepId: 1,  // 属于步骤1
  data: {...},
  style: {...},
  ...
}
```

### 4.3 步骤管理器
```javascript
class StepManager {
  steps: Step[]
  currentStepIndex: number
  
  // 核心方法
  parseSteps(commands: string[]): void
  executeToStep(index: number): void
  nextStep(): void
  prevStep(): void
  goToFirst(): void
  goToLast(): void
}
```

---

## 5. 流程设计

### 5.1 数据流
```
用户输入命令文本
       ↓
┌─────────────────────────────────────────┐
│ 1. 解析阶段                             │
│    - 按行分割命令                        │
│    - 识别 "---step 名称---" 标记         │
│    - 生成步骤数组                        │
└─────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────┐
│ 2. 执行阶段                             │
│    - 逐步骤执行                          │
│    - 步骤内命令一次性执行                 │
│    - 记录每个对象属于哪个步骤             │
└─────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────┐
│ 3. 渲染阶段                             │
│    - 根据当前步骤控制对象可见性           │
│    - 新对象淡入动画                      │
└─────────────────────────────────────────┘
```

### 5.2 步骤切换流程
```
用户点击 [下一步]
       ↓
┌─────────────────────────────────────────┐
│ 1. 检查是否还有下一步                    │
│    - 已是最后一步 → 提示用户              │
└─────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────┐
│ 2. 执行下一步的所有命令                  │
│    - tokenize → parse → execute          │
│    - 记录新创建的对象                     │
└─────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────┐
│ 3. 更新可见性                            │
│    - 隐藏后续步骤的对象                   │
│    - 显示当前及之前步骤的对象             │
│    - 新对象执行淡入动画                   │
└─────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────┐
│ 4. 更新 UI                               │
│    - 步骤列表高亮当前步骤                 │
│    - 步骤计数器更新                       │
└─────────────────────────────────────────┘
```

---

## 6. UI 设计

### 6.1 布局调整
```
┌─────────────────────────────────────────────────────────┐
│  Header (40px)                                          │
├────┬────────────────────────────────────────────────────┤
│    │                                    │  右侧面板     │
│ 工 │          3D 视口                   │  (280px)     │
│ 具 │                                    │ ┌──────────┐ │
│ 栏 │                                    │ │ 属性面板 │ │
│    │                                    │ │ (120px)  │ │
│    │                                    │ ├──────────┤ │
│    │                                    │ │ 步骤面板 │ │
│    │                                    │ │ (剩余)   │ │
│    │                                    │ │          │ │
├────┴────────────────────────────────────────────────────┤
│  命令面板 (140px)                                       │
└─────────────────────────────────────────────────────────┘
```

### 6.2 步骤面板设计
```
┌─────────────────────────────────────────┐
│ 步骤控制                                │
├─────────────────────────────────────────┤
│ [⏮ 首步] [◀ 上步] [2/5] [▶ 下步] [⏭ 末步] │
├─────────────────────────────────────────┤
│ ✓ 步骤 1: 基础点                        │
│ ✓ 步骤 2: 连线                          │
│ ▶ 步骤 3: 构造三角形  ◀当前             │
│   步骤 4: 添加辅助线                    │
│   步骤 5: 标注角度                      │
└─────────────────────────────────────────┘
```

### 6.3 控制按钮说明
- `⏮ 首步`：跳转到第一步（清空后重新执行到第一步）
- `◀ 上步`：后退一步（清空后重新执行到上一步）
- `▶ 下步`：前进一步
- `⏭ 末步`：跳转到最后一步（执行所有剩余步骤）

---

## 7. 文件结构

```
src/
├── parser/
│   ├── tokenizer.js      (不修改)
│   ├── parser.js         (不修改)
│   └── executor.js       (修改：支持步骤标记解析)
├── geometry/
│   ├── store.js          (修改：对象增加 stepId 属性)
│   └── types.js          (不修改)
├── render/
│   ├── scene.js          (不修改)
│   ├── geomRenderer.js   (修改：支持淡入淡出动画)
│   └── labelRenderer.js  (不修改)
├── interaction/
│   └── ...               (不修改)
├── utils/
│   └── stepManager.js    (新建：步骤管理器)
└── main.js               (修改：集成步骤面板UI)
```

---

## 8. 关键实现细节

### 8.1 淡入动画实现
```javascript
function fadeIn(object, duration = 500) {
  if (!object.material) return;
  
  object.material.transparent = true;
  object.material.opacity = 0;
  object.visible = true;
  
  const startTime = Date.now();
  
  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    object.material.opacity = progress;
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      object.material.transparent = false;
      object.material.opacity = 1;
    }
  }
  
  animate();
}
```

### 8.2 可见性控制
```javascript
function updateVisibility(currentStep) {
  store.getAll().forEach(obj => {
    if (obj.renderRef) {
      if (obj.stepId <= currentStep) {
        fadeIn(obj.renderRef);
      } else {
        obj.renderRef.visible = false;
      }
    }
  });
}
```

### 8.3 步骤解析
```javascript
function parseSteps(commands) {
  const steps = [];
  let currentStep = { name: "准备", commands: [], stepId: 0 };
  
  for (const cmd of commands) {
    const stepMatch = cmd.match(/^---step\s+(.+?)---$/);
    
    if (stepMatch) {
      // 保存当前步骤（如果有命令）
      if (currentStep.commands.length > 0) {
        steps.push(currentStep);
      }
      // 创建新步骤
      currentStep = {
        name: stepMatch[1],
        commands: [],
        stepId: steps.length
      };
    } else {
      currentStep.commands.push(cmd);
    }
  }
  
  // 保存最后一个步骤
  if (currentStep.commands.length > 0) {
    steps.push(currentStep);
  }
  
  return steps;
}
```

---

## 9. 边界情况处理

| 情况 | 处理方式 |
|------|----------|
| 无步骤标记的命令 | 归入"准备"步骤 |
| 连续多个步骤标记 | 合并为空步骤或忽略 |
| 步骤标记后无命令 | 跳过该步骤 |
| 步骤内命令执行失败 | 抛出错误，停止执行 |
| 已是第一步时点击上步 | 按钮禁用，提示用户 |
| 已是最后一步时点击下步 | 按钮禁用，提示用户 |
| 对象被后续步骤删除 | 保持删除状态，不恢复 |

---

## 10. 未来扩展（暂不实现）

- 自动播放功能
- 步骤编辑（重命名、合并、拆分）
- 步骤跳转
- 动画速度控制
- 导出为动画/视频
- 步骤批注/说明文字
