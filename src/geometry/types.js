/**
 * 几何对象类型定义
 */

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
 * 获取默认样式
 * @param {string} type - 对象类型
 * @returns {Object} 默认样式
 */
function getDefaultStyle(type) {
    const baseStyle = {
        visible: true,
        label: null  // null 表示使用对象名
    };

    switch (type) {
        case 'point':
            return { ...baseStyle, color: '#e0dcd2' };
        case 'segment':
            return { ...baseStyle, color: '#e0dcd2', dash: false, lineWidth: 2 };
        case 'line':
        case 'ray':
            return { ...baseStyle, color: '#e0dcd2', dash: true, lineWidth: 2 };
        case 'triangle':
        case 'polygon':
            return { ...baseStyle, color: '#c9a04a', opacity: 0.3 };
        case 'plane':
            return { ...baseStyle, color: '#c9a04a', opacity: 0.2 };
        default:
            return { ...baseStyle, color: '#e0dcd2' };
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
