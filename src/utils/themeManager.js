/**
 * 主题管理器
 * 统一管理主题状态，提供主题感知的颜色
 */

// 暗色主题默认颜色
const DARK_COLORS = {
    point: '#e0dcd2',
    line: '#e0dcd2',
    face: '#c9a04a',
    accent: '#4aa0c9',
    selected: '#55ccee',
    background: 0x0b0b12,
    grid: 0x1a1a28
};

// 浅色主题默认颜色
const LIGHT_COLORS = {
    point: '#1a1a28',
    line: '#1a1a28',
    face: '#b08030',
    accent: '#2a80a9',
    selected: '#0088aa',
    background: 0xd8d6d0,
    grid: 0xb0aea8
};

class ThemeManager {
    constructor(bus) {
        this.bus = bus;
        this.currentTheme = 'dark';
    }

    /**
     * 设置当前主题
     * @param {string} theme - 'dark' 或 'light'
     */
    setTheme(theme) {
        this.currentTheme = theme;
        this.bus.emit('theme:changed', { theme });
    }

    /**
     * 获取当前主题
     * @returns {string}
     */
    getTheme() {
        return this.currentTheme;
    }

    /**
     * 是否为暗色主题
     * @returns {boolean}
     */
    isDark() {
        return this.currentTheme === 'dark';
    }

    /**
     * 获取当前主题的颜色配置
     * @returns {Object}
     */
    getColors() {
        return this.isDark() ? DARK_COLORS : LIGHT_COLORS;
    }

    /**
     * 获取点的默认颜色
     * @returns {string}
     */
    getPointColor() {
        return this.getColors().point;
    }

    /**
     * 获取线的默认颜色
     * @returns {string}
     */
    getLineColor() {
        return this.getColors().line;
    }

    /**
     * 获取面的默认颜色
     * @returns {string}
     */
    getFaceColor() {
        return this.getColors().face;
    }

    /**
     * 获取背景色
     * @returns {number}
     */
    getBackgroundColor() {
        return this.getColors().background;
    }

    /**
     * 获取网格色
     * @returns {number}
     */
    getGridColor() {
        return this.getColors().grid;
    }
}

// 单例
let instance = null;

/**
 * 获取 ThemeManager 单例
 * @param {EventBus} bus - 事件总线（仅首次需要）
 * @returns {ThemeManager}
 */
export function getThemeManager(bus) {
    if (!instance && bus) {
        instance = new ThemeManager(bus);
    }
    return instance;
}

export { DARK_COLORS, LIGHT_COLORS };
