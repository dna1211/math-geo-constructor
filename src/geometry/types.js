/**
 * 几何对象类型定义
 */

import { getThemeManager } from '../utils/themeManager.js';

/**
 * 创建几何对象
 * @param {string} name - 对象名称
 * @param {string} type - 对象类型
 * @param {Object} data - 类型特有数据
 * @param {Array<string>} parents - 依赖的父对象名称
 * @returns {Object} 几何对象
 */
export function createGeomObject(name, type, data, parents = []) {
    return {
        name,
        type,
        data,
        style: getDefaultStyle(type),
        parents,
        renderRef: null,  // Three.js 对象引用
        compute: null     // 重算函数，用于父对象变化时重新计算 data
    };
}

/**
 * 获取默认样式（根据当前主题）
 * @param {string} type - 对象类型
 * @returns {Object} 默认样式
 */
function getDefaultStyle(type) {
    const themeManager = getThemeManager();
    const baseStyle = {
        visible: true,
        label: null  // null 表示使用对象名
    };

    // 获取主题感知的颜色
    const pointColor = themeManager ? themeManager.getPointColor() : '#e0dcd2';
    const lineColor = themeManager ? themeManager.getLineColor() : '#e0dcd2';
    const faceColor = themeManager ? themeManager.getFaceColor() : '#c9a04a';

    switch (type) {
        case 'point':
            return { ...baseStyle, color: pointColor };
        case 'segment':
            return { ...baseStyle, color: lineColor, dash: false, lineWidth: 2 };
        case 'line':
        case 'ray':
            return { ...baseStyle, color: lineColor, dash: true, lineWidth: 2 };
        case 'triangle':
        case 'polygon':
            return { ...baseStyle, color: faceColor, opacity: 0.3 };
        case 'plane':
            return { ...baseStyle, color: faceColor, opacity: 0.2 };
        default:
            return { ...baseStyle, color: pointColor };
    }
}

/**
 * 对象类型枚举
 */
export const GeomType = {
    POINT: 'point',
    SEGMENT: 'segment',
    LINE: 'line',
    RAY: 'ray',
    TRIANGLE: 'triangle',
    POLYGON: 'polygon',
    PLANE: 'plane'
};
