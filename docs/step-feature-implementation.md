# 解题步骤功能 - 详细实现步骤

## 实现阶段概览

| 阶段 | 内容 | 涉及文件 | 预计工作量 |
|------|------|----------|------------|
| 阶段1 | 新建 StepManager 类 | `src/utils/stepManager.js` | 核心逻辑 |
| 阶段2 | 修改 Executor | `src/parser/executor.js` | 步骤解析 |
| 阶段3 | 修改 ObjectStore | `src/geometry/store.js` | 对象扩展 |
| 阶段4 | 修改 GeomRenderer | `src/render/geomRenderer.js` | 动画支持 |
| 阶段5 | 修改 main.js | `src/main.js` | UI集成 |
| 阶段6 | 修改 CSS | `src/style.css` | 布局调整 |

---

## 阶段1：新建 StepManager 类

### 文件：`src/utils/stepManager.js`

### 1.1 类结构设计

```javascript
/**
 * 步骤管理器
 * 管理解题步骤的解析、执行和切换
 */
export class StepManager {
  constructor(store, bus, executor) {
    this.store = store;
    this.bus = bus;
    this.executor = executor;
    
    this.steps = [];              // 步骤列表
    this.currentStepIndex = -1;   // 当前步骤索引（-1表示未开始）
    this.isStepMode = false;      // 是否处于步骤模式
  }
}
```

### 1.2 核心方法列表

#### `parseSteps(commands: string[]): Step[]`
- **功能**：解析命令列表，识别步骤标记
- **输入**：命令字符串数组
- **输出**：步骤数组
- **逻辑**：
  1. 遍历命令列表
  2. 识别 `---step 名称---` 标记
  3. 将命令分组到对应步骤
  4. 处理边界情况（无标记命令归入"准备"步骤）

#### `executeStep(stepIndex: number): void`
- **功能**：执行指定步骤的所有命令
- **输入**：步骤索引
- **逻辑**：
  1. 获取步骤对象
  2. 遍历步骤内的命令
  3. 调用 executor.execute() 执行每条命令
  4. 记录新创建的对象名称
  5. 更新步骤状态为 'executed'

#### `goToStep(targetIndex: number): void`
- **功能**：跳转到指定步骤
- **输入**：目标步骤索引
- **逻辑**：
  1. 验证目标索引有效性
  2. 如果是前进：逐步执行到目标步骤
  3. 如果是后退：清空后重新执行到目标步骤
  4. 更新当前步骤索引
  5. 发出步骤切换事件

#### `nextStep(): void`
- **功能**：前进到下一步
- **逻辑**：
  1. 检查是否已是最后一步
  2. 调用 goToStep(currentStepIndex + 1)

#### `prevStep(): void`
- **功能**：后退到上一步
- **逻辑**：
  1. 检查是否已是第一步
  2. 调用 goToStep(currentStepIndex - 1)

#### `goToFirst(): void`
- **功能**：跳转到第一步
- **逻辑**：
  1. 清空所有对象
  2. 重新执行到第一步

#### `goToLast(): void`
- **功能**：跳转到最后一步
- **逻辑**：
  1. 逐步执行所有剩余步骤

#### `updateVisibility(): void`
- **功能**：更新对象可见性
- **逻辑**：
  1. 遍历所有对象
  2. 根据 stepId 与 currentStepIndex 比较
  3. 控制对象的显示/隐藏

#### `isFirstStep(): boolean`
- **功能**：判断是否是第一步
- **返回**：boolean

#### `isLastStep(): boolean`
- **功能**：判断是否是最后一步
- **返回**：boolean

#### `getStepCount(): number`
- **功能**：获取步骤总数
- **返回**：number

#### `getCurrentStep(): Step | null`
- **功能**：获取当前步骤
- **返回**：当前步骤对象或null

### 1.3 事件定义

| 事件名 | 参数 | 说明 |
|--------|------|------|
| `steps:parsed` | `{ steps }` | 步骤解析完成 |
| `step:changed` | `{ from, to, step }` | 步骤切换 |
| `step:executed` | `{ stepIndex, step }` | 步骤执行完成 |
| `step:mode-changed` | `{ isStepMode }` | 步骤模式切换 |

---

## 阶段2：修改 Executor

### 文件：`src/parser/executor.js`

### 2.1 修改点

#### 添加步骤感知支持
- 在 execute 方法中识别步骤标记
- 记录执行的命令所属步骤
- 支持批量执行命令

### 2.2 具体修改

#### 2.2.1 添加步骤标记识别方法

```javascript
/**
 * 检查是否是步骤标记
 * @param {string} command - 命令字符串
 * @returns {object|null} - 步骤信息或null
 */
parseStepMarker(command) {
  const match = command.trim().match(/^---step\s+(.+?)---$/);
  if (match) {
    return { name: match[1] };
  }
  return null;
}
```

#### 2.2.2 添加批量执行方法

```javascript
/**
 * 批量执行命令列表
 * @param {string[]} commands - 命令列表
 * @param {number} stepId - 步骤ID
 * @returns {string[]} - 新创建的对象名称列表
 */
executeBatch(commands, stepId) {
  const createdObjects = [];
  
  for (const cmd of commands) {
    try {
      const tokens = tokenize(cmd);
      const ast = parse(tokens);
      
      for (const node of ast) {
        // 记录执行前的对象列表
        const beforeNames = new Set(this.store.getNames());
        
        // 执行命令
        this.execute(node);
        
        // 找出新创建的对象
        const afterNames = this.store.getNames();
        for (const name of afterNames) {
          if (!beforeNames.has(name)) {
            const obj = this.store.get(name);
            if (obj) {
              obj.stepId = stepId;  // 设置步骤ID
            }
            createdObjects.push(name);
          }
        }
      }
    } catch (error) {
      console.error(`命令执行失败: ${cmd}`, error);
      throw error;
    }
  }
  
  return createdObjects;
}
```

---

## 阶段3：修改 ObjectStore

### 文件：`src/geometry/store.js`

### 3.1 修改点

#### 对象结构扩展
- 在 createGeomObject 调用时增加 stepId 属性
- 提供按步骤过滤对象的方法

### 3.2 具体修改

#### 3.2.1 修改 register 方法

在 `register` 方法中，为对象添加 stepId 属性：

```javascript
register(name, definition) {
  // ... 现有代码 ...
  
  const obj = createGeomObject(
    name,
    definition.type,
    definition.data,
    definition.parents || []
  );
  
  // 新增：设置步骤ID
  obj.stepId = definition.stepId !== undefined ? definition.stepId : -1;
  
  // ... 现有代码 ...
}
```

#### 3.2.2 添加按步骤过滤方法

```javascript
/**
 * 获取指定步骤的对象
 * @param {number} stepId - 步骤ID
 * @returns {Array} - 对象数组
 */
getObjectsByStep(stepId) {
  const result = [];
  for (const [name, obj] of this.objects) {
    if (obj.stepId === stepId) {
      result.push(obj);
    }
  }
  return result;
}

/**
 * 获取指定步骤及之前的所有对象
 * @param {number} stepId - 步骤ID
 * @returns {Array} - 对象数组
 */
getObjectsUpToStep(stepId) {
  const result = [];
  for (const [name, obj] of this.objects) {
    if (obj.stepId <= stepId) {
      result.push(obj);
    }
  }
  return result;
}
```

---

## 阶段4：修改 GeomRenderer

### 文件：`src/render/geomRenderer.js`

### 4.1 修改点

#### 支持淡入动画
- 添加 fadeIn 方法
- 在对象创建时支持动画
- 监听步骤切换事件

### 4.2 具体修改

#### 4.2.1 添加淡入动画方法

```javascript
/**
 * 淡入动画
 * @param {THREE.Object3D} object - Three.js对象
 * @param {number} duration - 动画时长（毫秒）
 */
fadeIn(object, duration = 500) {
  if (!object) return;
  
  // 处理 Group 对象（如三角形、多边形）
  if (object.isGroup) {
    object.children.forEach(child => this.fadeIn(child, duration));
    return;
  }
  
  if (!object.material) return;
  
  // 设置透明属性
  object.material.transparent = true;
  object.material.opacity = 0;
  object.visible = true;
  
  const startTime = Date.now();
  
  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    object.material.opacity = progress;
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      // 动画完成，恢复非透明（如果不原本就是透明的）
      if (object.material.userData?.originalOpacity === undefined || 
          object.material.userData.originalOpacity >= 1) {
        object.material.transparent = false;
        object.material.opacity = 1;
      }
    }
  };
  
  animate();
}
```

#### 4.2.2 添加批量淡入方法

```javascript
/**
 * 批量淡入多个对象
 * @param {Array} objects - 对象数组
 * @param {number} stagger - 每个对象的延迟（毫秒）
 */
fadeInMultiple(objects, stagger = 50) {
  objects.forEach((obj, index) => {
    if (obj.renderRef) {
      setTimeout(() => {
        this.fadeIn(obj.renderRef);
      }, index * stagger);
    }
  });
}
```

#### 4.2.3 监听步骤切换事件

在构造函数中添加事件监听：

```javascript
// 监听步骤切换，执行淡入动画
this.bus.on('step:changed', ({ to, newObjects }) => {
  if (newObjects && newObjects.length > 0) {
    this.fadeInMultiple(newObjects);
  }
});
```

---

## 阶段5：修改 main.js

### 文件：`src/main.js`

### 5.1 修改点

#### 集成步骤管理器和UI
- 初始化 StepManager
- 添加步骤面板 HTML
- 绑定步骤控制按钮事件
- 处理命令输入的步骤模式

### 5.2 具体修改

#### 5.2.1 导入 StepManager

```javascript
import { StepManager } from './utils/stepManager.js';
```

#### 5.2.2 初始化 StepManager

在初始化部分添加：

```javascript
// 步骤管理器
const stepManager = new StepManager(store, bus, executor);
```

#### 5.2.3 修改 executeCommand 函数

```javascript
function executeCommand(input) {
  const feedback = document.getElementById('command-feedback');
  
  try {
    // 检查是否包含步骤标记
    const hasStepMarkers = input.includes('---step');
    
    if (hasStepMarkers) {
      // 步骤模式：解析步骤并只执行第一步
      const commands = input.split('\n').filter(line => line.trim());
      stepManager.parseSteps(commands);
      stepManager.goToStep(0);
      
      feedback.textContent = `✓ 已解析 ${stepManager.getStepCount()} 个步骤`;
      feedback.className = 'success';
    } else {
      // 普通模式：直接执行
      const tokens = tokenize(input);
      const ast = parse(tokens);
      
      for (const node of ast) {
        executor.execute(node);
      }
      
      feedback.textContent = `✓ 执行成功`;
      feedback.className = 'success';
    }
    
    // 记录历史
    commandHistory.add(input);
    
    // 3秒后清除
    if (feedbackTimer) clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => {
      feedback.textContent = '';
      feedback.className = '';
      feedbackTimer = null;
    }, 3000);
    
  } catch (error) {
    if (feedbackTimer) clearTimeout(feedbackTimer);
    feedback.textContent = `✗ ${error.message}`;
    feedback.className = 'error';
  }
}
```

#### 5.2.4 添加步骤面板 UI 更新函数

```javascript
/**
 * 更新步骤面板 UI
 */
function updateStepPanel() {
  const stepList = document.getElementById('step-list');
  const stepCounter = document.getElementById('step-counter');
  const btnPrev = document.getElementById('btn-step-prev');
  const btnNext = document.getElementById('btn-step-next');
  const btnFirst = document.getElementById('btn-step-first');
  const btnLast = document.getElementById('btn-step-last');
  
  // 更新步骤列表
  if (stepList) {
    stepList.innerHTML = '';
    stepManager.steps.forEach((step, index) => {
      const div = document.createElement('div');
      div.className = 'step-item';
      
      if (index < stepManager.currentStepIndex) {
        div.classList.add('executed');
      } else if (index === stepManager.currentStepIndex) {
        div.classList.add('current');
      } else {
        div.classList.add('pending');
      }
      
      div.innerHTML = `
        <span class="step-icon">${index <= stepManager.currentStepIndex ? '✓' : '○'}</span>
        <span class="step-name">${step.name}</span>
      `;
      
      stepList.appendChild(div);
    });
  }
  
  // 更新计数器
  if (stepCounter) {
    stepCounter.textContent = `${stepManager.currentStepIndex + 1} / ${stepManager.getStepCount()}`;
  }
  
  // 更新按钮状态
  if (btnPrev) btnPrev.disabled = stepManager.isFirstStep();
  if (btnNext) btnNext.disabled = stepManager.isLastStep();
  if (btnFirst) btnFirst.disabled = stepManager.isFirstStep();
  if (btnLast) btnLast.disabled = stepManager.isLastStep();
}
```

#### 5.2.5 绑定步骤控制按钮事件

```javascript
function bindStepControls() {
  const btnFirst = document.getElementById('btn-step-first');
  const btnPrev = document.getElementById('btn-step-prev');
  const btnNext = document.getElementById('btn-step-next');
  const btnLast = document.getElementById('btn-step-last');
  
  if (btnFirst) {
    btnFirst.addEventListener('click', () => {
      stepManager.goToFirst();
      updateStepPanel();
    });
  }
  
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      stepManager.prevStep();
      updateStepPanel();
    });
  }
  
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      stepManager.nextStep();
      updateStepPanel();
    });
  }
  
  if (btnLast) {
    btnLast.addEventListener('click', () => {
      stepManager.goToLast();
      updateStepPanel();
    });
  }
}
```

#### 5.2.6 监听步骤事件

```javascript
// 监听步骤解析完成
bus.on('steps:parsed', () => {
  updateStepPanel();
});

// 监听步骤切换
bus.on('step:changed', () => {
  updateStepPanel();
});
```

#### 5.2.7 添加步骤面板 HTML

在 `bindUI()` 函数中或页面加载时添加步骤面板：

```javascript
function createStepPanel() {
  const properties = document.getElementById('properties');
  
  // 修改属性面板结构
  properties.innerHTML = `
    <div id="prop-section">
      <h3>属性</h3>
      <div id="prop-content">
        <p class="placeholder">选择对象查看属性</p>
      </div>
    </div>
    <div id="step-section">
      <h3>步骤控制</h3>
      <div class="step-controls">
        <button id="btn-step-first" class="step-btn" title="首步" disabled>⏮</button>
        <button id="btn-step-prev" class="step-btn" title="上步" disabled>◀</button>
        <span id="step-counter" class="step-counter">0 / 0</span>
        <button id="btn-step-next" class="step-btn" title="下步" disabled>▶</button>
        <button id="btn-step-last" class="step-btn" title="末步" disabled>⏭</button>
      </div>
      <div id="step-list" class="step-list">
        <p class="placeholder">输入包含步骤标记的命令</p>
      </div>
    </div>
  `;
}
```

---

## 阶段6：修改 CSS

### 文件：`src/style.css`

### 6.1 修改点

#### 调整属性面板布局
- 增加面板宽度（220px → 280px）
- 分割为上下两部分
- 添加步骤面板样式

### 6.2 具体修改

#### 6.2.1 修改属性面板宽度

```css
#properties {
  width: 280px;  /* 原来是 220px */
  background: var(--bg-secondary);
  border-left: 1px solid var(--border);
  padding: 12px;
  display: flex;
  flex-direction: column;
}
```

#### 6.2.2 添加属性区域样式

```css
#prop-section {
  flex-shrink: 0;
  max-height: 200px;
  overflow-y: auto;
  border-bottom: 1px solid var(--border);
  padding-bottom: 12px;
  margin-bottom: 12px;
}
```

#### 6.2.3 添加步骤区域样式

```css
#step-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

#step-section h3 {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 12px;
  color: var(--text-secondary);
}
```

#### 6.2.4 添加步骤控制按钮样式

```css
.step-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 12px;
}

.step-btn {
  width: 32px;
  height: 32px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.step-btn:hover:not(:disabled) {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.step-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.step-counter {
  flex: 1;
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
}
```

#### 6.2.5 添加步骤列表样式

```css
.step-list {
  flex: 1;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-tertiary);
  padding: 8px;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: default;
  transition: background 0.2s;
}

.step-item:hover {
  background: var(--bg);
}

.step-item .step-icon {
  width: 16px;
  text-align: center;
  font-size: 10px;
}

.step-item.executed .step-icon {
  color: var(--success);
}

.step-item.current {
  background: var(--accent);
  color: #fff;
}

.step-item.current .step-icon {
  color: #fff;
}

.step-item.pending {
  color: var(--text-secondary);
}

.step-item .step-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

#### 6.2.6 添加占位符样式

```css
.placeholder {
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
  padding: 16px;
}
```

---

## 测试用例

### 测试命令

```
A = Point(0, 0, 0)
B = Point(3, 0, 0)
---step 基础点---
Segment(A, B)
---step 连线---
C = Point(1.5, 2, 0)
Triangle(A, B, C)
---step 构造三角形---
```

### 预期行为

1. 输入命令后，解析出3个步骤
2. 初始状态显示步骤1的内容（两个点）
3. 点击"下步"后，显示步骤2的内容（线段淡入）
4. 点击"下步"后，显示步骤3的内容（三角形淡入）
5. 点击"上步"后，隐藏步骤3的内容
6. 步骤列表正确高亮当前步骤
7. 按钮状态正确（第一步时禁用"上步"，最后一步时禁用"下步"）

---

## 注意事项

1. **性能考虑**：后退操作需要清空并重新执行，对于大量对象可能有性能问题
2. **错误处理**：步骤内命令执行失败时应停止并提示用户
3. **状态一致性**：确保步骤切换时对象状态保持一致
4. **动画冲突**：避免多个动画同时执行导致的问题
5. **内存管理**：及时清理不再显示的对象引用
