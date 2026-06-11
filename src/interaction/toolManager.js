/**
 * 工具状态机
 * 管理工具状态和状态转换
 */

export const ToolState = {
    IDLE: 'idle',                    // 默认，可选择
    DRAG: 'drag',                    // 拖拽模式，点击点后可拖拽
    PLACING_POINT: 'placing',        // 画点模式，点击放置
    DRAWING_LINE: 'drawing',         // 画线模式，依次选两点
    DRAWING_POLYGON: 'polygon'       // 画面模式，依次选点，双击闭合
};

export class ToolManager {
    constructor(bus) {
        this.bus = bus;
        this.state = ToolState.IDLE;
        this.previousState = null;

        // 临时数据（用于画线/画面）
        this.tempData = [];
    }

    /**
     * 获取当前状态
     * @returns {string}
     */
    getState() {
        return this.state;
    }

    /**
     * 切换工具
     * @param {string} tool - 工具名称
     */
    setTool(tool) {
        this.previousState = this.state;
        this.tempData = [];

        switch (tool) {
            case 'select':
                this.state = ToolState.IDLE;
                break;
            case 'point':
                this.state = ToolState.PLACING_POINT;
                break;
            case 'line':
                this.state = ToolState.DRAWING_LINE;
                break;
            case 'polygon':
                this.state = ToolState.DRAWING_POLYGON;
                break;
            case 'drag':
                this.state = ToolState.DRAG;
                break;
            default:
                this.state = ToolState.IDLE;
        }

        this.bus.emit('tool:changed', { current: this.state, previous: this.previousState });
    }

    /**
     * 取消当前操作
     */
    cancel() {
        this.previousState = this.state;
        this.state = ToolState.IDLE;
        this.tempData = [];
        this.bus.emit('tool:changed', { current: this.state, previous: this.previousState });
    }

    /**
     * 添加临时数据
     * @param {*} data
     */
    addTempData(data) {
        this.tempData.push(data);
    }

    /**
     * 获取临时数据
     * @returns {Array}
     */
    getTempData() {
        return this.tempData;
    }

    /**
     * 清空临时数据
     */
    clearTempData() {
        this.tempData = [];
    }

    /**
     * 检查是否在画线模式
     * @returns {boolean}
     */
    isDrawingLine() {
        return this.state === ToolState.DRAWING_LINE;
    }

    /**
     * 检查是否在画面模式
     * @returns {boolean}
     */
    isDrawingPolygon() {
        return this.state === ToolState.DRAWING_POLYGON;
    }

    /**
     * 检查是否在画点模式
     * @returns {boolean}
     */
    isPlacingPoint() {
        return this.state === ToolState.PLACING_POINT;
    }

    /**
     * 检查是否在空闲状态
     * @returns {boolean}
     */
    isIdle() {
        return this.state === ToolState.IDLE;
    }

    /**
     * 检查是否在拖拽模式
     * @returns {boolean}
     */
    isDragging() {
        return this.state === ToolState.DRAG;
    }
}
