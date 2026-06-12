/**
 * 快捷键模块
 * 管理全局键盘快捷键
 */

export class Shortcuts {
    constructor(options) {
        this.toolbar = options.toolbar;
        this.toolManager = options.toolManager;
        this.selector = options.selector;
        this.store = options.store;
        this.history = options.history;
        this.storage = options.storage;
        this.sceneManager = options.sceneManager;
        this.propPanel = options.propPanel;
        this.helpModal = options.helpModal;

        // 绑定事件
        this.bindEvents();
    }

    /**
     * 绑定全局键盘事件
     */
    bindEvents() {
        document.addEventListener('keydown', (e) => {
            // 如果焦点在输入框，不处理
            const input = document.getElementById('command-input');
            if (document.activeElement === input) return;

            this.handleKeyDown(e);
        });
    }

    /**
     * 处理键盘事件
     * @param {KeyboardEvent} e - 键盘事件
     */
    handleKeyDown(e) {
        // 工具切换
        const toolKeys = {
            'v': 'select', 'V': 'select',
            'p': 'point', 'P': 'point',
            'l': 'line', 'L': 'line',
            't': 'polygon', 'T': 'polygon',
            'h': 'drag', 'H': 'drag'
        };

        if (toolKeys[e.key]) {
            this.toolbar.setTool(toolKeys[e.key]);
            return;
        }

        // Escape
        if (e.key === 'Escape') {
            this.toolManager.cancel();
            this.toolbar.updateButtons('select');
            if (this.helpModal) {
                this.helpModal.classList.remove('active');
            }
            return;
        }

        // F1 帮助
        if (e.key === 'F1') {
            e.preventDefault();
            if (this.helpModal) {
                this.helpModal.classList.toggle('active');
            }
            return;
        }

        // Delete/Backspace 删除选中
        if (e.key === 'Delete' || e.key === 'Backspace') {
            const selected = this.selector.getSelected();
            if (selected) {
                this.store.unregister(selected);
                this.selector.clearSelection();
                this.propPanel.update(null);
            }
            return;
        }

        // Space 切换投影
        if (e.key === ' ') {
            e.preventDefault();
            this.sceneManager.toggleProjection();
            return;
        }

        // Ctrl 组合键
        if (e.ctrlKey || e.metaKey) {
            this.handleCtrlKey(e);
        }
    }

    /**
     * 处理 Ctrl 组合键
     * @param {KeyboardEvent} e - 键盘事件
     */
    handleCtrlKey(e) {
        // Ctrl+Z 撤销
        if (e.key === 'z' || e.key === 'Z') {
            e.preventDefault();
            this.history.undo();
            return;
        }

        // Ctrl+Y 重做
        if (e.key === 'y' || e.key === 'Y') {
            e.preventDefault();
            this.history.redo();
            return;
        }

        // Ctrl+S 保存文件
        if (e.key === 's' || e.key === 'S') {
            e.preventDefault();
            this.storage.saveToFile();
            return;
        }

        // Ctrl+O 加载文件
        if (e.key === 'o' || e.key === 'O') {
            e.preventDefault();
            this.loadFile();
            return;
        }

        // Ctrl+P 导出 PNG
        if (e.key === 'p' || e.key === 'P') {
            e.preventDefault();
            this.sceneManager.exportPNG();
            return;
        }
    }

    /**
     * 加载文件
     */
    loadFile() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    await this.storage.loadFromFile(file);
                    console.log('项目加载成功');
                } catch (err) {
                    console.error('加载失败:', err);
                }
            }
        };
        fileInput.click();
    }
}
