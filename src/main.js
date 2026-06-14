/**
 * 3D 几何构造工具 - 主入口
 * 初始化各模块，组装 UI，启动应用
 */

import * as THREE from 'three';
import { SceneManager } from './render/scene.js';
import { GeomRenderer } from './render/geomRenderer.js';
import { LabelRenderer } from './render/labelRenderer.js';
import { ObjectStore } from './geometry/store.js';
import { Executor } from './parser/executor.js';
import { Picker } from './interaction/picker.js';
import { Selector } from './interaction/selector.js';
import { Dragger } from './interaction/dragger.js';
import { ToolManager } from './interaction/toolManager.js';
import { HistoryManager } from './geometry/history.js';
import { StorageManager } from './storage.js';
import { getThemeManager } from './utils/themeManager.js';
import { StepManager } from './utils/stepManager.js';
import { bus } from './utils/eventBus.js';

// UI 模块
import { StepPanel } from './ui/stepPanel.js';
import { PropPanel } from './ui/propPanel.js';
import { Toolbar } from './ui/toolbar.js';
import { CommandPanel } from './ui/commandPanel.js';
import { Shortcuts } from './ui/shortcuts.js';
import { ndcToWorld, getPickableObjects } from './ui/utils.js';

// ===== 初始化核心模块 =====
const themeManager = getThemeManager(bus);
const sceneManager = new SceneManager(bus);
const store = new ObjectStore(bus);
const history = new HistoryManager(store, bus);
const executor = new Executor(store, bus, history);
const stepManager = new StepManager(store, bus, executor);
const storage = new StorageManager(store, bus, stepManager);

// 渲染器
const viewport = document.getElementById('viewport');
const labelRenderer = new LabelRenderer(sceneManager.scene, sceneManager.camera, viewport, bus);
const geomRenderer = new GeomRenderer(sceneManager.scene, store, bus, labelRenderer, sceneManager.renderer);

// 交互系统
const picker = new Picker(sceneManager.camera, sceneManager.scene, store);
const selector = new Selector(store, bus);
const dragger = new Dragger(store, picker, bus);
const toolManager = new ToolManager(bus);

// ===== 初始化 UI 模块 =====
const toolbar = new Toolbar(toolManager);
const propPanel = new PropPanel(store, bus);
const stepPanel = new StepPanel(stepManager, bus);
const commandPanel = new CommandPanel(store, executor, stepManager, stepPanel);

// 快捷键
const shortcuts = new Shortcuts({
    toolbar,
    toolManager,
    selector,
    store,
    history,
    storage,
    sceneManager,
    propPanel,
    helpModal: document.getElementById('help-modal')
});

// ===== Canvas 交互 =====
let globalPointCounter = 0;

function bindCanvasEvents() {
    const canvas = document.getElementById('canvas');

    canvas.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;

        const ndc = Picker.screenToNDC(e.clientX, e.clientY, canvas);
        const targets = getPickableObjects(sceneManager.scene);
        const hit = picker.pick(ndc.x, ndc.y, targets);

        if (hit) {
            const name = hit.userData?.objectName || hit.parent?.userData?.objectName;

            if (toolManager.isIdle()) {
                selector.select(name);
                propPanel.update(name);
            } else if (toolManager.isDragging()) {
                const obj = store.get(name);
                if (obj && obj.type === 'point') {
                    selector.select(name);
                    propPanel.update(name);
                    dragger.startDrag(name, e.clientX, e.clientY, canvas);
                    sceneManager.controls.enabled = false;
                }
            } else if (toolManager.isPlacingPoint()) {
                const obj = store.get(name);
                if (obj && obj.type === 'point') {
                    selector.select(name);
                    propPanel.update(name);
                }
            } else if (toolManager.isDrawingLine()) {
                toolManager.addTempData(name);
                if (toolManager.getTempData().length === 2) {
                    const [from, to] = toolManager.getTempData();
                    commandPanel.executeCommand(`Segment(${from}, ${to})`);
                    toolManager.clearTempData();
                    toolManager.setTool('select');
                    toolbar.updateButtons('select');
                }
            } else if (toolManager.isDrawingPolygon()) {
                toolManager.addTempData(name);
            }
        } else {
            if (toolManager.isIdle()) {
                selector.clearSelection();
                propPanel.update(null);
            } else if (toolManager.isPlacingPoint()) {
                const worldPos = ndcToWorld(ndc.x, ndc.y, sceneManager.camera);
                globalPointCounter++;
                const pointName = `P${globalPointCounter}`;
                commandPanel.executeCommand(`${pointName} = Point(${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, 0)`);
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
            sceneManager.controls.enabled = true;
        }
    });

    canvas.addEventListener('dblclick', () => {
        if (toolManager.isDrawingPolygon()) {
            const points = toolManager.getTempData();
            if (points.length >= 3) {
                commandPanel.executeCommand(`Polygon(${points.join(', ')})`);
            }
            toolManager.clearTempData();
            toolManager.setTool('select');
            toolbar.updateButtons('select');
        }
    });
}

// ===== 主题切换 =====
function bindThemeToggle() {
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
    themeManager.setTheme(savedTheme);
    sceneManager.setTheme(savedTheme);

    btnTheme.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        applyTheme(next);
        localStorage.setItem(THEME_KEY, next);
        sceneManager.setTheme(next);
    });
}

// ===== 帮助弹窗 =====
function bindHelpModal() {
    const btnHelp = document.getElementById('btn-help');
    const helpModal = document.getElementById('help-modal');
    const modalClose = document.querySelector('.modal-close');

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
}

// ===== Grid/Axis 命令 =====
function bindGridAxisEvents() {
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
}

// ===== 对象删除事件 =====
function bindObjectEvents() {
    bus.on('object:deleted', ({ name }) => {
        if (selector.getSelected() === name) {
            selector.clearSelection();
            propPanel.update(null);
        }
    });
}

// ===== 启动 =====
function init() {
    bindCanvasEvents();
    bindThemeToggle();
    bindHelpModal();
    bindGridAxisEvents();
    bindObjectEvents();

    // 尝试从 localStorage 恢复
    const savedData = storage.loadFromLocalStorage();
    if (savedData) {
        console.log('已从自动保存恢复');
    }

    // 将 labelRenderer 传递给 sceneManager 用于渲染循环
    sceneManager.labelRenderer = labelRenderer;
    sceneManager.animate();

    console.log('3D 几何构造工具已启动');
}

init();
