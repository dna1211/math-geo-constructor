/**
 * 命令面板模块
 * 管理命令输入、执行、历史记录和自动补全
 */

import { tokenize } from '../parser/tokenizer.js';
import { parse } from '../parser/parser.js';

export class CommandPanel {
    constructor(store, executor, stepManager, stepPanel) {
        this.store = store;
        this.executor = executor;
        this.stepManager = stepManager;
        this.stepPanel = stepPanel;

        // 命令历史
        this.history = [];
        this.historyIndex = -1;

        // 反馈定时器
        this.feedbackTimer = null;

        // DOM 元素
        this.input = document.getElementById('command-input');
        this.btnExecute = document.getElementById('btn-execute');
        this.btnClear = document.getElementById('btn-clear');
        this.feedback = document.getElementById('command-feedback');

        // 绑定事件
        this.bindEvents();
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 执行按钮
        if (this.btnExecute) {
            this.btnExecute.addEventListener('click', () => {
                this.execute();
            });
        }

        // 清空按钮
        if (this.btnClear) {
            this.btnClear.addEventListener('click', () => {
                this.executeCommand('Clear');
                this.input.value = '';
                this.input.style.height = 'auto';
                this.input.focus();
            });
        }

        // 键盘事件
        if (this.input) {
            this.input.addEventListener('keydown', (e) => {
                // Enter 执行
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.execute();
                }

                // 上键翻阅历史
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.input.value = this.prevHistory();
                }

                // 下键翻阅历史
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.input.value = this.nextHistory();
                }

                // Esc 清空
                if (e.key === 'Escape') {
                    this.input.value = '';
                    this.input.style.height = 'auto';
                }

                // Tab 补全
                if (e.key === 'Tab') {
                    e.preventDefault();
                    this.autoComplete();
                }
            });

            // 自动调整高度
            this.input.addEventListener('input', () => {
                this.input.style.height = 'auto';
                this.input.style.height = Math.min(this.input.scrollHeight, 100) + 'px';
            });
        }
    }

    /**
     * 执行当前输入
     */
    execute() {
        if (!this.input) return;

        const value = this.input.value.trim();
        if (value) {
            this.executeCommand(value);
            this.input.value = '';
            this.input.style.height = 'auto';
        }
    }

    /**
     * 执行命令
     * @param {string} input - 命令字符串
     */
    executeCommand(input) {
        try {
            // 检查是否包含步骤标记
            const hasStepMarkers = input.includes('---step');

            if (hasStepMarkers) {
                // 步骤模式：解析步骤并只执行第一步
                const commands = input.split('\n').filter(line => line.trim());
                this.stepManager.parseSteps(commands);
                this.stepManager.goToStep(0);

                // 更新步骤面板
                this.stepPanel.update();

                this.showFeedback(`✓ 已解析 ${this.stepManager.getStepCount()} 个步骤`, 'success');
            } else {
                // 普通模式：直接执行
                const tokens = tokenize(input);
                const ast = parse(tokens);

                for (const node of ast) {
                    this.executor.execute(node);
                }

                this.showFeedback('✓ 执行成功', 'success');
            }

            // 记录历史
            this.addHistory(input);

        } catch (error) {
            this.showFeedback(`✗ ${error.message}`, 'error');
        }
    }

    /**
     * 显示反馈信息
     * @param {string} message - 反馈信息
     * @param {string} type - 类型（success/error）
     */
    showFeedback(message, type) {
        if (!this.feedback) return;

        if (this.feedbackTimer) {
            clearTimeout(this.feedbackTimer);
        }

        this.feedback.textContent = message;
        this.feedback.className = type;

        this.feedbackTimer = setTimeout(() => {
            this.feedback.textContent = '';
            this.feedback.className = '';
            this.feedbackTimer = null;
        }, 3000);
    }

    /**
     * 添加命令到历史
     * @param {string} input - 命令
     */
    addHistory(input) {
        this.history.push(input);
        this.historyIndex = this.history.length;
    }

    /**
     * 获取上一条历史命令
     * @returns {string}
     */
    prevHistory() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            return this.history[this.historyIndex];
        }
        return this.history[0] || '';
    }

    /**
     * 获取下一条历史命令
     * @returns {string}
     */
    nextHistory() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            return this.history[this.historyIndex];
        }
        this.historyIndex = this.history.length;
        return '';
    }

    /**
     * 自动补全
     */
    autoComplete() {
        if (!this.input) return;

        const value = this.input.value;
        const cursorPos = this.input.selectionStart;

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
                this.input.value = value.substring(0, startPos) + partial + completion + value.substring(cursorPos);
                this.input.selectionStart = this.input.selectionEnd = cursorPos + completion.length;
            }
            return;
        }

        // 命令无匹配时，匹配对象名称
        const objMatches = this.store.getNames().filter(name => name.toLowerCase().startsWith(lowerPartial));
        if (objMatches.length === 0) return;

        let prefix = objMatches[0];
        for (let i = 1; i < objMatches.length; i++) {
            while (!objMatches[i].toLowerCase().startsWith(prefix.toLowerCase())) {
                prefix = prefix.slice(0, -1);
            }
        }
        const completion = prefix.slice(partial.length);
        if (completion) {
            this.input.value = value.substring(0, startPos) + partial + completion + value.substring(cursorPos);
            this.input.selectionStart = this.input.selectionEnd = cursorPos + completion.length;
        }
    }
}
