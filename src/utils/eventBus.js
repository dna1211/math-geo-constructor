/**
 * 事件总线
 * 模块间解耦通信
 */

// 事件名称常量（防止拼写错误）
export const EVENTS = {
    // 对象生命周期
    OBJECT_CREATED: 'object:created',
    OBJECT_UPDATED: 'object:updated',
    OBJECT_DELETED: 'object:deleted',

    // Store 状态
    STORE_CLEARED: 'store:cleared',

    // 选择
    SELECT_CHANGED: 'select:changed',

    // 命令
    COMMAND_GRID: 'command:grid',
    COMMAND_AXIS: 'command:axis',
    COMMAND_UNDO: 'command:undo',
    COMMAND_REDO: 'command:redo',

    // 步骤
    STEPS_PARSED: 'steps:parsed',
    STEP_CHANGED: 'step:changed',
    STEP_EXECUTED: 'step:executed',

    // 主题
    THEME_CHANGED: 'theme:changed',
};

class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    /**
     * 监听事件
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     * @returns {Function} 取消监听函数
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        return () => this.off(event, callback);
    }

    /**
     * 取消监听
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    off(event, callback) {
        this.listeners.get(event)?.delete(callback);
    }

    /**
     * 触发事件
     * @param {string} event - 事件名称
     * @param {*} data - 事件数据
     */
    emit(event, data) {
        const listeners = this.listeners.get(event);

        // 开发环境调试日志
        if (import.meta.env.DEV) {
            console.log(`[EventBus] ${event}`, data);
        }

        // 监听器数量检查（检测内存泄漏）
        if (listeners?.size > 10) {
            console.warn(`[EventBus] 事件 "${event}" 有 ${listeners.size} 个监听器，可能存在泄漏`);
        }

        listeners?.forEach(cb => cb(data));
    }

    /**
     * 监听一次事件
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    once(event, callback) {
        const wrapper = (data) => {
            callback(data);
            this.off(event, wrapper);
        };
        this.on(event, wrapper);
    }

    /**
     * 获取事件的监听器数量（调试用）
     * @param {string} event - 事件名称
     * @returns {number}
     */
    listenerCount(event) {
        return this.listeners.get(event)?.size || 0;
    }

    /**
     * 获取所有事件名称（调试用）
     * @returns {string[]}
     */
    eventNames() {
        return Array.from(this.listeners.keys());
    }
}

// 全局单例
export const bus = new EventBus();
