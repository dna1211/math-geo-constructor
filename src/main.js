/**
 * 3D 几何构造工具 - 主入口
 * 组装各模块，绑定 UI 事件
 */

import { SceneManager } from './render/scene.js';
import { GeomRenderer } from './render/geomRenderer.js';
import { ObjectStore } from './geometry/store.js';
import { Executor } from './parser/executor.js';
import { tokenize } from './parser/tokenizer.js';
import { parse } from './parser/parser.js';
import { bus } from './utils/eventBus.js';

// ===== 初始化 =====
const sceneManager = new SceneManager();
const store = new ObjectStore(bus);
const executor = new Executor(store, bus);
const geomRenderer = new GeomRenderer(sceneManager.scene, store, bus);

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

// ===== 绑定 UI =====
function bindUI() {
    const input = document.getElementById('command-input');
    const btnExecute = document.getElementById('btn-execute');
    const btnClear = document.getElementById('btn-clear');

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
            // TODO: 切换工具状态
        });
    });
}

// ===== 启动 =====
bindUI();
sceneManager.animate();

console.log('3D 几何构造工具已启动');
