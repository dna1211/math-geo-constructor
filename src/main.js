/**
 * 3D 几何构造工具 - 主入口
 * 组装各模块，绑定 UI 事件
 */

import { SceneManager } from './render/scene.js';
import { GeomRenderer } from './render/geomRenderer.js';
import { LabelRenderer } from './render/labelRenderer.js';
import { ObjectStore } from './geometry/store.js';
import { Executor } from './parser/executor.js';
import { tokenize } from './parser/tokenizer.js';
import { parse } from './parser/parser.js';
import { bus } from './utils/eventBus.js';
import { Picker } from './interaction/picker.js';
import { Selector } from './interaction/selector.js';
import { Dragger } from './interaction/dragger.js';
import { ToolManager } from './interaction/toolManager.js';

// ===== 初始化 =====
const sceneManager = new SceneManager();
const store = new ObjectStore(bus);
const executor = new Executor(store, bus);

// 标签渲染器
const viewport = document.getElementById('viewport');
const labelRenderer = new LabelRenderer(sceneManager.scene, sceneManager.camera, viewport);

// 几何渲染器
const geomRenderer = new GeomRenderer(sceneManager.scene, store, bus, labelRenderer);

// 交互系统
const picker = new Picker(sceneManager.camera, sceneManager.scene);
const selector = new Selector(store, bus);
const dragger = new Dragger(store, picker, bus);
const toolManager = new ToolManager(bus);

// ===== 命令历史 =====
const commandHistory = {
    history: [],
    index: -1,

    add(input) {
        this.history.push(input);
        this.index = this.history.length;
    },

    prev() {
        if (this.index > 0) {
            this.index--;
            return this.history[this.index];
        }
        return this.history[0] || '';
    },

    next() {
        if (this.index < this.history.length - 1) {
            this.index++;
            return this.history[this.index];
        }
        this.index = this.history.length;
        return '';
    }
};

// ===== 命令执行 =====
function executeCommand(input) {
    const feedback = document.getElementById('command-feedback');

    try {
        // 1. 词法分析
        const tokens = tokenize(input);

        // 2. 语法解析
        const ast = parse(tokens);

        // 3. 执行
        for (const node of ast) {
            executor.execute(node);
        }

        // 4. 记录历史
        commandHistory.add(input);

        // 5. 显示成功
        feedback.textContent = `✓ 执行成功`;
        feedback.className = 'success';

        // 3 秒后清除
        setTimeout(() => {
            feedback.textContent = '';
            feedback.className = '';
        }, 3000);

    } catch (error) {
        feedback.textContent = `✗ ${error.message}`;
        feedback.className = 'error';
    }
}

// ===== 属性面板更新 =====
function updateProperties(name) {
    const content = document.getElementById('prop-content');

    if (!name) {
        content.innerHTML = '<p class="placeholder">选择对象查看属性</p>';
        return;
    }

    const obj = store.get(name);
    if (!obj) return;

    let html = '';

    // 基本信息
    html += `<div class="prop-row"><label>名称</label><input type="text" value="${obj.name}" readonly></div>`;
    html += `<div class="prop-row"><label>类型</label><input type="text" value="${obj.type}" readonly></div>`;

    // 坐标（点对象）
    if (obj.type === 'point') {
        html += `<div class="prop-row"><label>X</label><input type="number" step="0.1" value="${obj.data.x}" data-prop="x"></div>`;
        html += `<div class="prop-row"><label>Y</label><input type="number" step="0.1" value="${obj.data.y}" data-prop="y"></div>`;
        html += `<div class="prop-row"><label>Z</label><input type="number" step="0.1" value="${obj.data.z}" data-prop="z"></div>`;
    }

    // 样式
    html += `<div class="prop-row"><label>颜色</label><input type="color" value="${obj.style.color || '#e0dcd2'}" data-prop="color"></div>`;
    html += `<div class="prop-row"><label>可见</label><input type="checkbox" ${obj.style.visible ? 'checked' : ''} data-prop="visible"></div>`;

    content.innerHTML = html;

    // 绑定属性修改事件
    content.querySelectorAll('input[data-prop]').forEach(input => {
        input.addEventListener('change', (e) => {
            const prop = e.target.dataset.prop;
            let value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;

            if (['x', 'y', 'z'].includes(prop)) {
                value = parseFloat(value);
                store.update(name, { data: { [prop]: value } });
            } else if (prop === 'color') {
                store.update(name, { style: { color: value } });
            } else if (prop === 'visible') {
                store.update(name, { style: { visible: value } });
            }
        });
    });
}

// ===== 绑定 UI =====
function bindUI() {
    const input = document.getElementById('command-input');
    const btnExecute = document.getElementById('btn-execute');
    const btnClear = document.getElementById('btn-clear');
    const canvas = document.getElementById('canvas');

    // 执行按钮
    btnExecute.addEventListener('click', () => {
        const value = input.value.trim();
        if (value) {
            executeCommand(value);
            input.value = '';
            input.style.height = 'auto';
        }
    });

    // 清空按钮
    btnClear.addEventListener('click', () => {
        input.value = '';
        input.style.height = 'auto';
        input.focus();
    });

    // 键盘事件
    input.addEventListener('keydown', (e) => {
        // Enter 执行
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            btnExecute.click();
        }

        // 上键翻阅历史
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            input.value = commandHistory.prev();
        }

        // 下键翻阅历史
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            input.value = commandHistory.next();
        }

        // Esc 清空
        if (e.key === 'Escape') {
            input.value = '';
            input.style.height = 'auto';
        }
    });

    // 自动调整高度
    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });

    // 工具栏按钮
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            toolManager.setTool(btn.dataset.tool);
        });
    });

    // ===== Canvas 鼠标事件 =====
    canvas.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;  // 只处理左键

        const ndc = Picker.screenToNDC(e.clientX, e.clientY, canvas);
        const targets = getPickableObjects();
        const hit = picker.pick(ndc.x, ndc.y, targets);

        if (hit) {
            const name = hit.userData?.objectName || hit.parent?.userData?.objectName;

            if (toolManager.isIdle()) {
                // 选择模式
                selector.select(name);
                updateProperties(name);

                // 开始拖拽（如果是点）
                const obj = store.get(name);
                if (obj && obj.type === 'point') {
                    dragger.startDrag(name, e.clientX, e.clientY, canvas);
                    // 禁用 OrbitControls
                    sceneManager.controls.enabled = false;
                }
            } else if (toolManager.isDrawingLine()) {
                // 画线模式
                toolManager.addTempData(name);
                if (toolManager.getTempData().length === 2) {
                    const [from, to] = toolManager.getTempData();
                    executeCommand(`Segment(${from}, ${to})`);
                    toolManager.clearTempData();
                    toolManager.setTool('select');
                }
            } else if (toolManager.isDrawingPolygon()) {
                // 画面模式
                toolManager.addTempData(name);
            }
        } else {
            if (toolManager.isIdle()) {
                selector.clearSelection();
                updateProperties(null);
            }
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (dragger.isDraggingNow()) {
            dragger.drag(e.clientX, e.clientY, canvas);
            // 更新依赖对象
            updateDependentObjects(dragger.getDragTarget());
        }
    });

    canvas.addEventListener('mouseup', () => {
        if (dragger.isDraggingNow()) {
            dragger.endDrag();
            // 启用 OrbitControls
            sceneManager.controls.enabled = true;
        }
    });

    canvas.addEventListener('dblclick', () => {
        if (toolManager.isDrawingPolygon()) {
            const points = toolManager.getTempData();
            if (points.length >= 3) {
                executeCommand(`Polygon(${points.join(', ')})`);
            }
            toolManager.clearTempData();
            toolManager.setTool('select');
        }
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        // 如果焦点在输入框，不处理
        if (document.activeElement === input) return;

        switch (e.key) {
            case 'v':
            case 'V':
                toolManager.setTool('select');
                updateToolButtons('select');
                break;
            case 'p':
            case 'P':
                toolManager.setTool('point');
                updateToolButtons('point');
                break;
            case 'l':
            case 'L':
                toolManager.setTool('line');
                updateToolButtons('line');
                break;
            case 't':
            case 'T':
                toolManager.setTool('polygon');
                updateToolButtons('polygon');
                break;
            case 'h':
            case 'H':
                toolManager.setTool('drag');
                updateToolButtons('drag');
                break;
            case 'Escape':
                toolManager.cancel();
                updateToolButtons('select');
                break;
            case 'Delete':
            case 'Backspace':
                const selected = selector.getSelected();
                if (selected) {
                    store.unregister(selected);
                    selector.clearSelection();
                    updateProperties(null);
                }
                break;
            case ' ':
                // Space 切换投影方式
                e.preventDefault();
                sceneManager.toggleProjection();
                break;
        }
    });

    // 监听选择变化事件
    bus.on('select:changed', ({ selected }) => {
        updateProperties(selected);
    });

    // 监听对象删除事件
    bus.on('object:deleted', ({ name }) => {
        if (selector.getSelected() === name) {
            selector.clearSelection();
            updateProperties(null);
        }
    });
}

// 获取可拾取对象
function getPickableObjects() {
    const objects = [];
    sceneManager.scene.traverse(child => {
        if (child.userData?.objectName) {
            objects.push(child);
        }
    });
    return objects;
}

// 更新依赖对象
function updateDependentObjects(name) {
    if (!name) return;

    // 获取所有受影响的对象
    const affected = store.getAffected(name);

    // 重新渲染每个受影响的对象
    affected.forEach(objName => {
        const obj = store.get(objName);
        if (obj && objName !== name) {
            // 触发更新事件
            bus.emit('object:updated', { name: objName, obj });
        }
    });
}

// 更新工具栏按钮状态
function updateToolButtons(tool) {
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tool === tool);
    });
}

// ===== 启动 =====
bindUI();

// 将 labelRenderer 传递给 sceneManager 用于渲染循环
sceneManager.labelRenderer = labelRenderer;
sceneManager.animate();

console.log('3D 几何构造工具已启动');
