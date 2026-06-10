/**
 * 几何构造函数
 * 复杂几何图形的构造算法
 */

import * as calc from './calc.js';

/**
 * 在线段上构造正多边形
 * @param {Object} segment - 线段 {from: {x,y,z}, to: {x,y,z}}
 * @param {number} sides - 边数（3=正三角形，4=正方形，...）
 * @param {Object} refPlane - 参考平面 {normal: {x,y,z}} 或 {points: [p1,p2,p3]}
 * @param {number} angle - 与参考平面的夹角（度）
 * @returns {Array<Object>} 顶点坐标数组
 */
export function constructRegularPolygon(segment, sides, refPlane, angle) {
    if (sides < 3) {
        throw new Error('正多边形至少需要 3 条边');
    }

    const { from, to } = segment;

    // 计算边长
    const edgeLength = calc.distance(from, to);

    // 计算线段中点
    const mid = calc.midpoint(from, to);

    // 计算线段方向向量
    const edgeDir = calc.normalize(calc.subtract(to, from));

    // 计算参考平面的法向量
    let refNormal;
    if (refPlane.normal) {
        refNormal = calc.normalize(refPlane.normal);
    } else if (refPlane.points) {
        const [p1, p2, p3] = refPlane.points;
        const v1 = calc.subtract(p2, p1);
        const v2 = calc.subtract(p3, p1);
        refNormal = calc.normalize(calc.cross(v1, v2));
    } else {
        throw new Error('需要提供参考平面');
    }

    // 计算正多边形所在平面的法向量
    // 首先计算垂直于线段的向量
    const perpDir = calc.cross(edgeDir, refNormal);

    // 如果线段与参考平面平行，选择一个任意的垂直方向
    let baseNormal;
    if (calc.length(perpDir) < 0.0001) {
        // 线段与参考平面法向量平行，选择任意垂直方向
        const temp = Math.abs(edgeDir.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
        baseNormal = calc.normalize(calc.cross(edgeDir, temp));
    } else {
        baseNormal = calc.normalize(perpDir);
    }

    // 将 baseNormal 绕 edgeDir 旋转指定角度
    const angleRad = angle * Math.PI / 180;
    const rotatedNormal = rotateAroundAxis(baseNormal, edgeDir, angleRad);

    // 计算正多边形的顶点
    const vertices = [];
    const centralAngle = (2 * Math.PI) / sides;

    // 计算从中心到顶点的距离（外接圆半径）
    const circumradius = edgeLength / (2 * Math.sin(Math.PI / sides));

    // 计算第一个顶点相对于中点的偏移
    // 第一个顶点在线段的 from 端
    vertices.push({ ...from });

    // 计算其余顶点
    for (let i = 1; i < sides; i++) {
        const theta = i * centralAngle;

        // 在正多边形平面内计算顶点位置
        // 使用 edgeDir 和 rotatedNormal 作为基向量
        const x = circumradius * Math.cos(theta);
        const y = circumradius * Math.sin(theta);

        const vertex = {
            x: mid.x + x * edgeDir.x + y * rotatedNormal.x,
            y: mid.y + x * edgeDir.y + y * rotatedNormal.y,
            z: mid.z + x * edgeDir.z + y * rotatedNormal.z
        };

        vertices.push(vertex);
    }

    return vertices;
}

/**
 * 构造正三角形（简化版）
 * @param {Object} segment - 线段
 * @param {Object} refPlane - 参考平面
 * @param {number} angle - 与参考平面的夹角
 * @returns {Array<Object>} 三个顶点坐标
 */
export function constructEquilateralTriangle(segment, refPlane, angle) {
    return constructRegularPolygon(segment, 3, refPlane, angle);
}

/**
 * 绕轴旋转向量
 * @param {Object} v - 待旋转向量
 * @param {Object} axis - 旋转轴（单位向量）
 * @param {number} angle - 旋转角度（弧度）
 * @returns {Object} 旋转后的向量
 */
function rotateAroundAxis(v, axis, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dot = calc.dot(v, axis);
    const cross = calc.cross(axis, v);

    return {
        x: v.x * cos + cross.x * sin + axis.x * dot * (1 - cos),
        y: v.y * cos + cross.y * sin + axis.y * dot * (1 - cos),
        z: v.z * cos + cross.z * sin + axis.z * dot * (1 - cos)
    };
}
