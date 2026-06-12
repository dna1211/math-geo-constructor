/**
 * 3D 几何构造工具 - 主入口
 * 组装各模块，绑定 UI 事件
 */

import * as THREE from 'three';
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
import { HistoryManager } from './geometry/history.js';
import { StorageManager } from './storage.js';
import { getThemeManager } from './utils/themeManager.js';
import { StepManager } from './utils/stepManager.js';

// ===== 初始化 =====
// 初始化主题管理器
const themeManager = getThemeManager(bus);

const sceneManager = new SceneManager(bus);
const store = new ObjectStore(bus);
const history = new HistoryManager(store, bus);
const storage = new StorageManager(store, bus);
const executor = new Executor(store, bus, history);

// 步骤管理器
const stepManager = new StepManager(store, bus, executor);

// 标签渲染器
const viewport = document.getElementById('viewport');
const labelRenderer = new LabelRenderer(sceneManager.scene, sceneManager.camera, viewport, bus);

// 几何渲染器
const geomRenderer = new GeomRenderer(sceneManager.scene, store, bus, labelRenderer, sceneManager.renderer);

// 交互系统
const picker = new Picker(sceneManager.camera, sceneManager.scene);
const selector = new Selector(store, bus);
const dragger = new Dragger(store, picker, bus);
const toolManager = new ToolManager(bus);

// 全局点计数器（避免删除后名称冲突）
let globalPointCounter = 0;

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
let feedbackTimer = null;

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

            // 更新步骤面板
            updateStepPanel();

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

// HTML 转义
function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ===== 步骤面板 =====
function updateStepPanel() {
    const stepList = document.getElementById('step-list');
    const stepCounter = document.getElementById('step-counter');
    const btnPrev = document.getElementById('btn-step-prev');
    const btnNext = document.getElementById('btn-step-next');
    const btnFirst = document.getElementById('btn-step-first');
    const btnLast = document.getElementById('btn-step-last');

    if (!stepList) return;

    // 更新步骤列表
    stepList.innerHTML = '';

    if (stepManager.steps.length === 0) {
        stepList.innerHTML = '<p class="placeholder">输入包含步骤标记的命令</p>';
    } else {
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

            const icon = index <= stepManager.currentStepIndex ? '✓' : '○';
            div.innerHTML = `
                <span class="step-icon">${icon}</span>
                <span class="step-name">${escapeHtml(step.name)}</span>
            `;

            // 添加点击事件：跳转到该步骤
            div.addEventListener('click', () => {
                if (stepManager.steps.length === 0) return;
                stepManager.goToStep(index);
                updateStepPanel();
            });

            // 添加鼠标样式
            div.style.cursor = 'pointer';

            stepList.appendChild(div);
        });
    }

    // 更新计数器
    if (stepCounter) {
        if (stepManager.steps.length === 0) {
            stepCounter.textContent = '0 / 0';
        } else {
            stepCounter.textContent = `${stepManager.currentStepIndex + 1} / ${stepManager.getStepCount()}`;
        }
    }

    // 更新按钮状态
    const isFirst = stepManager.isFirstStep();
    const isLast = stepManager.isLastStep();
    const noSteps = stepManager.steps.length === 0;

    if (btnPrev) btnPrev.disabled = isFirst || noSteps;
    if (btnNext) btnNext.disabled = isLast || noSteps;
    if (btnFirst) btnFirst.disabled = isFirst || noSteps;
    if (btnLast) btnLast.disabled = isLast || noSteps;
}

function bindStepControls() {
    const btnFirst = document.getElementById('btn-step-first');
    const btnPrev = document.getElementById('btn-step-prev');
    const btnNext = document.getElementById('btn-step-next');
    const btnLast = document.getElementById('btn-step-last');

    if (btnFirst) {
        btnFirst.addEventListener('click', () => {
            if (stepManager.steps.length === 0) return;
            stepManager.goToFirst();
            updateStepPanel();
        });
    }

    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            if (stepManager.steps.length === 0) return;
            stepManager.prevStep();
            updateStepPanel();
        });
    }

    if (btnNext) {
        btnNext.addEventListener('click', () => {
            if (stepManager.steps.length === 0) return;
            stepManager.nextStep();
            updateStepPanel();
        });
    }

    if (btnLast) {
        btnLast.addEventListener('click', () => {
            if (stepManager.steps.length === 0) return;
            stepManager.goToLast();
            updateStepPanel();
        });
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

    // 基本信息（转义防止 XSS）
    html += `<div class="prop-row"><label>名称</label><input type="text" value="${escapeHtml(obj.name)}" readonly></div>`;
    html += `<div class="prop-row"><label>类型</label><input type="text" value="${escapeHtml(obj.type)}" readonly></div>`;

    // 坐标（点对象）
    if (obj.type === 'point') {
        html += `<div class="prop-row"><label>X</label><input type="number" step="0.1" value="${obj.data.x}" data-prop="x"></div>`;
        html += `<div class="prop-row"><label>Y</label><input type="number" step="0.1" value="${obj.data.y}" data-prop="y"></div>`;
        html += `<div class="prop-row"><label>Z</label><input type="number" step="0.1" value="${obj.data.z}" data-prop="z"></div>`;
    }

    // 样式
    html += `<div class="prop-row"><label>颜色</label><input type="color" value="${obj.style.color || '#e0dcd2'}" data-prop="color"></div>`;

    // 线宽和虚线（仅线段、直线、射线）
    if (['segment', 'line', 'ray'].includes(obj.type)) {
        const lw = obj.style.lineWidth || 2;
        html += `<div class="prop-row"><label>线宽</label><input type="range" min="1" max="10" step="0.5" value="${lw}" data-prop="lineWidth"><span class="lw-value">${lw}</span></div>`;
        html += `<div class="prop-row"><label>虚线</label><input type="checkbox" ${obj.style.dash ? 'checked' : ''} data-prop="dash"></div>`;
    }

    html += `<div class="prop-row"><label>可见</label><input type="checkbox" ${obj.style.visible ? 'checked' : ''} data-prop="visible"></div>`;

    content.innerHTML = html;

    // 绑定属性修改事件
    content.querySelectorAll('input[data-prop]').forEach(input => {
        const handleUpdate = (e) => {
            const prop = e.target.dataset.prop;
            let value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;

            if (['x', 'y', 'z'].includes(prop)) {
                value = parseFloat(value);
                store.update(name, { data: { [prop]: value } });
            } else if (prop === 'color') {
                store.update(name, { style: { color: value } });
            } else if (prop === 'lineWidth') {
                value = parseFloat(value);
                store.update(name, { style: { lineWidth: value } });
                // 更新滑块旁的数值显示
                const span = e.target.parentElement.querySelector('.lw-value');
                if (span) span.textContent = value;
            } else if (prop === 'dash') {
                store.update(name, { style: { dash: value } });
            } else if (prop === 'visible') {
                store.update(name, { style: { visible: value } });
            }
        };

        input.addEventListener('change', handleUpdate);
        // range 滑块实时更新
        if (input.type === 'range') {
            input.addEventListener('input', handleUpdate);
        }
    });
}

// ===== 绑定 UI =====
function bindUI() {
    const input = document.getElementById('command-input');
    const btnExecute = document.getElementById('btn-execute');
    const btnClear = document.getElementById('btn-clear');
    const canvas = document.getElementById('canvas');
    const btnHelp = document.getElementById('btn-help');
    const helpModal = document.getElementById('help-modal');
    const modalClose = document.querySelector('.modal-close');

    // 帮助弹窗
    btnHelp.addEventListener('click', () => {
        helpModal.classList.add('active');
    });

    modalClose.addEventListener('click', () => {
        helpModal.classList.remove('active');
    });

    helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
            helpModal.classList.remove('active');
        }
    });

    // 主题切换
    const btnTheme = document.getElementById('btn-theme');
    const THEME_KEY = 'geometry-tool-theme';

    function applyTheme(theme) {
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            btnTheme.textContent = '☀️';
            btnTheme.title = '切换为暗色主题';
        } else {
            document.documentElement.removeAttribute('data-theme');
            btnTheme.textContent = '🌙';
            btnTheme.title = '切换为浅色主题';
        }
    }

    // 读取保存的主题偏好
    const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
    applyTheme(savedTheme);
    // 初始化主题管理器和场景
    themeManager.setTheme(savedTheme);
    sceneManager.setTheme(savedTheme);

    btnTheme.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        applyTheme(next);
        localStorage.setItem(THEME_KEY, next);
        sceneManager.setTheme(next);
    });

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
        executeCommand('Clear');
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

        // Tab 补全
        if (e.key === 'Tab') {
            e.preventDefault();
            autoComplete(input);
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
                // 选择模式：只选择，不拖拽
                selector.select(name);
                updateProperties(name);
            } else if (toolManager.isDragging()) {
                // 拖拽模式：点击点后可拖拽
                const obj = store.get(name);
                if (obj && obj.type === 'point') {
                    selector.select(name);
                    updateProperties(name);
                    dragger.startDrag(name, e.clientX, e.clientY, canvas);
                    sceneManager.controls.enabled = false;
                }
            } else if (toolManager.isPlacingPoint()) {
                // 画点模式 - 点击已有对象时，取其中心点
                const obj = store.get(name);
                if (obj && obj.type === 'point') {
                    // 点击已有点，选择它
                    selector.select(name);
                    updateProperties(name);
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
            } else if (toolManager.isPlacingPoint()) {
                // 画点模式 - 点击空白处，在鼠标位置创建点
                const ndc = Picker.screenToNDC(e.clientX, e.clientY, canvas);
                // 将 NDC 坐标转换为世界坐标（在 Z=0 平面上）
                const worldPos = ndcToWorld(ndc.x, ndc.y);
                globalPointCounter++;
                const pointName = `P${globalPointCounter}`;
                executeCommand(`${pointName} = Point(${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, 0)`);
            }
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (dragger.isDraggingNow()) {
            dragger.drag(e.clientX, e.clientY, canvas);
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
                helpModal.classList.remove('active');
                break;
            case 'F1':
                e.preventDefault();
                helpModal.classList.toggle('active');
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

        // Ctrl+Z 撤销，Ctrl+Y 重做
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z' || e.key === 'Z') {
                e.preventDefault();
                history.undo();
            } else if (e.key === 'y' || e.key === 'Y') {
                e.preventDefault();
                history.redo();
            } else if (e.key === 's' || e.key === 'S') {
                // Ctrl+S 保存文件
                e.preventDefault();
                storage.saveToFile();
            } else if (e.key === 'o' || e.key === 'O') {
                // Ctrl+O 加载文件
                e.preventDefault();
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        try {
                            await storage.loadFromFile(file);
                            console.log('项目加载成功');
                        } catch (err) {
                            console.error('加载失败:', err);
                        }
                    }
                };
                input.click();
            } else if (e.key === 'p' || e.key === 'P') {
                // Ctrl+P 导出 PNG
                e.preventDefault();
                sceneManager.exportPNG();
            }
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

    // 监听 Grid/Axis 命令
    bus.on('command:grid', ({ visible }) => {
        if (typeof visible === 'boolean') {
            sceneManager.grid.visible = visible;
        } else {
            sceneManager.toggleGrid();
        }
    });

    bus.on('command:axis', ({ visible }) => {
        if (typeof visible === 'boolean') {
            sceneManager.axes.visible = visible;
        } else {
            sceneManager.toggleAxes();
        }
    });

    // 绑定步骤控制按钮
    bindStepControls();

    // 监听步骤事件
    bus.on('steps:parsed', () => {
        updateStepPanel();
    });

    bus.on('step:changed', ({ newObjects }) => {
        updateStepPanel();

        // 对新对象执行淡入动画
        if (newObjects && newObjects.length > 0) {
            stepManager.fadeInMultiple(newObjects);
        }
    });

    bus.on('step:executed', () => {
        updateStepPanel();
    });

    // 监听清空事件，更新步骤面板
    bus.on('store:cleared', () => {
        updateStepPanel();
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

// NDC 坐标转世界坐标（在 Z=0 平面上）
function ndcToWorld(ndcX, ndcY) {
    const camera = sceneManager.camera;
    const vector = new THREE.Vector3(ndcX, ndcY, 0.5);
    vector.unproject(camera);

    const dir = vector.sub(camera.position).normalize();

    // 当相机视线平行于 XY 平面时 dir.z 接近 0，会产生除零
    if (Math.abs(dir.z) < 1e-6) {
        // 回退：使用相机到原点的距离作为默认距离
        const fallbackDist = camera.position.length();
        const pos = camera.position.clone().add(dir.multiplyScalar(fallbackDist));
        return { x: pos.x, y: pos.y };
    }

    const distance = -camera.position.z / dir.z;
    const pos = camera.position.clone().add(dir.multiplyScalar(distance));

    return { x: pos.x, y: pos.y };
}

// Tab 补全
function autoComplete(input) {
    const value = input.value;
    const cursorPos = input.selectionStart;

    // 获取光标前的文本
    const textBeforeCursor = value.substring(0, cursorPos);

    // 匹配最后一个标识符
    const match = textBeforeCursor.match(/[A-Za-z_][A-Za-z0-9_]*$/);
    if (!match) return;

    const partial = match[0];
    const startPos = cursorPos - partial.length;
    const lowerPartial = partial.toLowerCase();

    // 命令列表
    const commands = ['Point', 'Segment', 'Line', 'Ray', 'Triangle', 'Polygon', 'Plane',
                      'Midpoint', 'Fold', 'Reflect', 'Distance',
                      'Color', 'LineWidth', 'Dash', 'Opacity', 'Hide', 'Show', 'Label',
                      'Delete', 'Undo', 'Redo', 'Clear', 'Grid', 'Axis'];

    // 优先匹配命令
    const cmdMatches = commands.filter(cmd => cmd.toLowerCase().startsWith(lowerPartial));

    if (cmdMatches.length > 0) {
        let prefix = cmdMatches[0];
        for (let i = 1; i < cmdMatches.length; i++) {
            while (!cmdMatches[i].toLowerCase().startsWith(prefix.toLowerCase())) {
                prefix = prefix.slice(0, -1);
            }
        }
        const completion = prefix.slice(partial.length);
        if (completion) {
            input.value = value.substring(0, startPos) + partial + completion + value.substring(cursorPos);
            input.selectionStart = input.selectionEnd = cursorPos + completion.length;
        }
        return;
    }

    // 命令无匹配时，匹配对象名称
    const objMatches = store.getNames().filter(name => name.toLowerCase().startsWith(lowerPartial));
    if (objMatches.length === 0) return;

    let prefix = objMatches[0];
    for (let i = 1; i < objMatches.length; i++) {
        while (!objMatches[i].toLowerCase().startsWith(prefix.toLowerCase())) {
            prefix = prefix.slice(0, -1);
        }
    }
    const completion = prefix.slice(partial.length);
    if (completion) {
        input.value = value.substring(0, startPos) + partial + completion + value.substring(cursorPos);
        input.selectionStart = input.selectionEnd = cursorPos + completion.length;
    }
}

// ===== 启动 =====
bindUI();

// 尝试从 localStorage 恢复
const savedData = storage.loadFromLocalStorage();
if (savedData) {
    console.log('已从自动保存恢复');
}

// 将 labelRenderer 传递给 sceneManager 用于渲染循环
sceneManager.labelRenderer = labelRenderer;
sceneManager.animate();

console.log('3D 几何构造工具已启动');
