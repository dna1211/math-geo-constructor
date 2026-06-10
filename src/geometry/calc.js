/**
 * 几何计算函数
 */

/**
 * 计算中点
 * @param {Object} p1 - 点 {x, y, z}
 * @param {Object} p2 - 点 {x, y, z}
 * @returns {Object} 中点 {x, y, z}
 */
export function midpoint(p1, p2) {
    return {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
        z: (p1.z + p2.z) / 2
    };
}

/**
 * 绕轴旋转
 * @param {Object} point - 待旋转的点 {x, y, z}
 * @param {Object} axis - 旋转轴 {from: {x,y,z}, to: {x,y,z}}
 * @param {number} angle - 旋转角度（度）
 * @returns {Object} 旋转后的点 {x, y, z}
 */
export function fold(point, axis, angle) {
    const rad = angle * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // 旋转轴方向向量
    const dx = axis.to.x - axis.from.x;
    const dy = axis.to.y - axis.from.y;
    const dz = axis.to.z - axis.from.z;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (len === 0) return { ...point };

    // 归一化
    const ux = dx / len;
    const uy = dy / len;
    const uz = dz / len;

    // 平移到原点
    const px = point.x - axis.from.x;
    const py = point.y - axis.from.y;
    const pz = point.z - axis.from.z;

    // Rodrigues 旋转公式
    const dot = px * ux + py * uy + pz * uz;
    const crossX = uy * pz - uz * py;
    const crossY = uz * px - ux * pz;
    const crossZ = ux * py - uy * px;

    const rx = px * cos + crossX * sin + ux * dot * (1 - cos);
    const ry = py * cos + crossY * sin + uy * dot * (1 - cos);
    const rz = pz * cos + crossZ * sin + uz * dot * (1 - cos);

    // 平移回去
    return {
        x: rx + axis.from.x,
        y: ry + axis.from.y,
        z: rz + axis.from.z
    };
}

/**
 * 关于线对称（旋转 180 度）
 * @param {Object} point - 待反射的点 {x, y, z}
 * @param {Object} axis - 对称轴 {from: {x,y,z}, to: {x,y,z}}
 * @returns {Object} 反射后的点 {x, y, z}
 */
export function reflectLine(point, axis) {
    return fold(point, axis, 180);
}

/**
 * 关于平面对称
 * @param {Object} point - 待反射的点 {x, y, z}
 * @param {Object} plane - 平面 {a, b, c, d} 或 {points: [{x,y,z}, ...]}
 * @returns {Object} 反射后的点 {x, y, z}
 */
export function reflectPlane(point, plane) {
    let a, b, c, d;

    if (plane.points) {
        // 从三个点计算平面方程
        const [p1, p2, p3] = plane.points;
        const v1 = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };
        const v2 = { x: p3.x - p1.x, y: p3.y - p1.y, z: p3.z - p1.z };

        // 法向量 = v1 × v2
        a = v1.y * v2.z - v1.z * v2.y;
        b = v1.z * v2.x - v1.x * v2.z;
        c = v1.x * v2.y - v1.y * v2.x;
        d = -(a * p1.x + b * p1.y + c * p1.z);
    } else {
        ({ a, b, c, d } = plane);
    }

    // 检查平面法向量是否有效（防止除零）
    const lenSq = a * a + b * b + c * c;
    if (lenSq < 1e-10) {
        // 退化平面，返回原点
        return { ...point };
    }

    // 点到平面的距离
    const dist = (a * point.x + b * point.y + c * point.z + d) / lenSq;

    // 反射点
    return {
        x: point.x - 2 * a * dist,
        y: point.y - 2 * b * dist,
        z: point.z - 2 * c * dist
    };
}

/**
 * 点到点距离
 * @param {Object} p1 - 点 {x, y, z}
 * @param {Object} p2 - 点 {x, y, z}
 * @returns {number}
 */
export function distance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = p2.z - p1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * 点到平面距离
 * @param {Object} point - 点 {x, y, z}
 * @param {Object} plane - 平面 {a, b, c, d}
 * @returns {number}
 */
export function distanceToPlane(point, plane) {
    const { a, b, c, d } = plane;
    return Math.abs(a * point.x + b * point.y + c * point.z + d) / Math.sqrt(a * a + b * b + c * c);
}

/**
 * 向量叉积
 * @param {Object} v1 - 向量 {x, y, z}
 * @param {Object} v2 - 向量 {x, y, z}
 * @returns {Object} 叉积 {x, y, z}
 */
export function cross(v1, v2) {
    return {
        x: v1.y * v2.z - v1.z * v2.y,
        y: v1.z * v2.x - v1.x * v2.z,
        z: v1.x * v2.y - v1.y * v2.x
    };
}

/**
 * 向量点积
 * @param {Object} v1 - 向量 {x, y, z}
 * @param {Object} v2 - 向量 {x, y, z}
 * @returns {number}
 */
export function dot(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
}

/**
 * 向量归一化
 * @param {Object} v - 向量 {x, y, z}
 * @returns {Object} 归一化后的向量
 */
export function normalize(v) {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return {
        x: v.x / len,
        y: v.y / len,
        z: v.z / len
    };
}

/**
 * 向量长度
 * @param {Object} v - 向量 {x, y, z}
 * @returns {number}
 */
export function length(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

/**
 * 向量加法
 * @param {Object} v1 - 向量 {x, y, z}
 * @param {Object} v2 - 向量 {x, y, z}
 * @returns {Object} 和 {x, y, z}
 */
export function add(v1, v2) {
    return {
        x: v1.x + v2.x,
        y: v1.y + v2.y,
        z: v1.z + v2.z
    };
}

/**
 * 向量减法
 * @param {Object} v1 - 向量 {x, y, z}
 * @param {Object} v2 - 向量 {x, y, z}
 * @returns {Object} 差 {x, y, z}
 */
export function subtract(v1, v2) {
    return {
        x: v1.x - v2.x,
        y: v1.y - v2.y,
        z: v1.z - v2.z
    };
}

/**
 * 标量乘法
 * @param {Object} v - 向量 {x, y, z}
 * @param {number} s - 标量
 * @returns {Object} 积 {x, y, z}
 */
export function scale(v, s) {
    return {
        x: v.x * s,
        y: v.y * s,
        z: v.z * s
    };
}
