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

/**
 * 计算点到线段/直线的垂足
 * @param {Object} point - 外部点 {x, y, z}
 * @param {Object} lineFrom - 线段/直线起点 {x, y, z}
 * @param {Object} lineTo - 线段/直线终点 {x, y, z}
 * @returns {Object} 垂足坐标 {x, y, z}
 */
export function footOfPerpendicular(point, lineFrom, lineTo) {
    const ab = subtract(lineTo, lineFrom);
    const ap = subtract(point, lineFrom);
    const t = dot(ap, ab) / dot(ab, ab);
    return add(lineFrom, scale(ab, t));
}

/**
 * 计算过指定点且平行于给定线段/直线的第二点
 * @param {Object} point - 过点 {x, y, z}
 * @param {Object} lineFrom - 线段/直线起点 {x, y, z}
 * @param {Object} lineTo - 线段/直线终点 {x, y, z}
 * @returns {Object} 平行线上的第二点 {x, y, z}
 */
export function parallelThroughPoint(point, lineFrom, lineTo) {
    const dir = subtract(lineTo, lineFrom);
    return add(point, dir);
}

/**
 * 计算过指定点且垂直于给定线段/直线的第二点（即垂足）
 * 垂线上的第二点就是垂足本身
 * @param {Object} point - 过点 {x, y, z}
 * @param {Object} lineFrom - 线段/直线起点 {x, y, z}
 * @param {Object} lineTo - 线段/直线终点 {x, y, z}
 * @returns {Object} 垂线上的第二点（垂足） {x, y, z}
 */
export function perpendicularThroughPoint(point, lineFrom, lineTo) {
    return footOfPerpendicular(point, lineFrom, lineTo);
}

/**
 * 求两直线/线段的交点（3D 空间）
 * 对于异面直线，取两线最短距离的中点
 * @param {Object} p1 - 第一条线起点 {x, y, z}
 * @param {Object} q1 - 第一条线终点 {x, y, z}
 * @param {Object} p2 - 第二条线起点 {x, y, z}
 * @param {Object} q2 - 第二条线终点 {x, y, z}
 * @param {boolean} clampToSegment1 - 是否将交点限制在第一条线段内
 * @param {boolean} clampToSegment2 - 是否将交点限制在第二条线段内
 * @returns {Object|null} 交点 {x, y, z}，平行时返回 null
 */
export function lineIntersection(p1, q1, p2, q2, clampToSegment1 = false, clampToSegment2 = false) {
    const d1 = subtract(q1, p1);
    const d2 = subtract(q2, p2);
    const r = subtract(p1, p2);

    const a = dot(d1, d1);
    const b = dot(d1, d2);
    const c = dot(d2, d2);
    const d = dot(d1, r);
    const e = dot(d2, r);
    const denom = a * c - b * b;

    // 平行检测
    if (Math.abs(denom) < 1e-10) {
        return null;
    }

    // 求参数 t (在第一条线上) 和 s (在第二条线上)
    let t = (b * e - c * d) / denom;
    let s = (a * e - b * d) / denom;

    // 钳制到线段范围
    if (clampToSegment1) {
        t = Math.max(0, Math.min(1, t));
    }
    if (clampToSegment2) {
        s = Math.max(0, Math.min(1, s));
    }

    // 两个最近点
    const pointOnLine1 = add(p1, scale(d1, t));
    const pointOnLine2 = add(p2, scale(d2, s));

    // 对于共面相交线，两点应重合；对于异面线，取中点
    return midpoint(pointOnLine1, pointOnLine2);
}
