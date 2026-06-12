/**
 * 工具栏模块
 * 管理工具栏的 UI 更新和事件绑定
 */

export class Toolbar {
    constructor(toolManager) {
        this.toolManager = toolManager;

        // 绑定事件
        this.bindEvents();
    }

    /**
     * 绑定工具栏按钮事件
     */
    bindEvents() {
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setTool(btn.dataset.tool);
            });
        });
    }

    /**
     * 设置当前工具
     * @param {string} tool - 工具名称
     */
    setTool(tool) {
        this.toolManager.setTool(tool);
        this.updateButtons(tool);
    }

    /**
     * 更新工具栏按钮状态
     * @param {string} tool - 当前工具名称
     */
    updateButtons(tool) {
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
    }

    /**
     * 获取当前工具名称
     * @returns {string}
     */
    getCurrentTool() {
        return this.toolManager.getTool();
    }
}
