/**
 * 3D 拾取器
 * 封装 Raycaster，实现从屏幕坐标拾取对象
 */

import * as THREE from 'three';

export class Picker {
    constructor(camera, scene, store, config = {}) {
        this.camera = camera;
        this.scene = scene;
        this.store = store;
        this.raycaster = new THREE.Raycaster();
        this.pickRadius = config.pickRadius || 0.15;
    }

    /**
     * 从屏幕坐标拾取对象
     * @param {number} x - 屏幕 X 坐标（归一化设备坐标）
     * @param {number} y - 屏幕 Y 坐标（归一化设备坐标）
     * @param {Array<THREE.Object3D>} targets - 可拾取对象列表
     * @returns {THREE.Object3D|null} 命中的对象
     */
    pick(x, y, targets) {
        this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

        // 对于点对象，使用包围球检测
        for (const target of targets) {
            if (target.userData?.objectType === 'point') {
                const sphere = new THREE.Sphere(target.position, this.pickRadius);
                const intersection = new THREE.Vector3();
                if (this.raycaster.ray.intersectSphere(sphere, intersection)) {
                    return target;
                }
            }
        }

        // 对于线型对象（segment/line/ray），使用距离拾取
        let closestLine = null;
        let closestDist = this.pickRadius;

        for (const target of targets) {
            const objType = target.userData?.objectType;
            if (objType !== 'segment' && objType !== 'line' && objType !== 'ray') continue;

            const name = target.userData?.objectName;
            if (!name || !this.store) continue;

            const endpoints = this.getLineEndpoints(name);
            if (!endpoints) continue;

            const dist = this.raySegmentDistance(
                this.raycaster.ray.origin,
                this.raycaster.ray.direction,
                endpoints.from,
                endpoints.to
            );

            if (dist < closestDist) {
                closestDist = dist;
                closestLine = target;
            }
        }

        if (closestLine) return closestLine;

        return null;
    }

    /**
     * 从 store 获取线型对象的端点坐标
     * @param {string} name - 对象名称
     * @returns {{ from: THREE.Vector3, to: THREE.Vector3 }|null}
     */
    getLineEndpoints(name) {
        const obj = this.store.get(name);
        if (!obj || !obj.data) return null;

        if (obj.type === 'segment' || obj.type === 'line') {
            const from = this.store.get(obj.data.from);
            const to = this.store.get(obj.data.to);
            if (!from || !to) return null;
            return {
                from: new THREE.Vector3(from.data.x, from.data.y, from.data.z),
                to: new THREE.Vector3(to.data.x, to.data.y, to.data.z)
            };
        }

        if (obj.type === 'ray') {
            const origin = this.store.get(obj.data.origin);
            const through = this.store.get(obj.data.through);
            if (!origin || !through) return null;
            return {
                from: new THREE.Vector3(origin.data.x, origin.data.y, origin.data.z),
                to: new THREE.Vector3(through.data.x, through.data.y, through.data.z)
            };
        }

        return null;
    }

    /**
     * 计算射线到线段的最短距离
     * 基于 Dan Sunday 的射线-线段距离算法
     * @param {THREE.Vector3} rayOrigin - 射线起点
     * @param {THREE.Vector3} rayDir - 射线方向（单位向量）
     * @param {THREE.Vector3} segA - 线段起点
     * @param {THREE.Vector3} segB - 线段终点
     * @returns {number} 最短距离
     */
    raySegmentDistance(rayOrigin, rayDir, segA, segB) {
        const u = rayDir;
        const v = new THREE.Vector3().subVectors(segB, segA);
        const w = new THREE.Vector3().subVectors(rayOrigin, segA);

        const a = u.dot(u);  // >= 0 (should be 1 if normalized)
        const b = u.dot(v);
        const c = v.dot(v);  // >= 0
        const d = u.dot(w);
        const e = v.dot(w);
        const D = a * c - b * b;

        let sN, sD = D;
        let tN, tD = D;

        if (D < 1e-10) {
            // 射线与线段平行
            sN = 0;
            sD = 1;
            tN = e;
            tD = c;
        } else {
            sN = b * e - c * d;
            tN = a * e - b * d;
        }

        // 将 s = sN/sD 钳制到 [0, 1]
        if (sN < 0) {
            sN = 0;
            tN = e;
            tD = c;
        } else if (sN > sD) {
            sN = sD;
            tN = e + b;
            tD = c;
        }

        // 将 t = tN/tD 钳制到 [0, +inf)
        if (tN < 0) {
            tN = 0;
            // 重新钳制 s
            if (-d < 0) {
                sN = 0;
            } else if (-d > a) {
                sN = sD;
            } else {
                sN = -d;
                sD = a;
            }
        }

        const sc = Math.abs(sN) < 1e-10 ? 0 : sN / sD;
        const tc = Math.abs(tN) < 1e-10 ? 0 : tN / tD;

        // 最近点之间的向量
        const dP = new THREE.Vector3()
            .copy(w)
            .addScaledVector(u, tc)
            .addScaledVector(v, -sc);

        return dP.length();
    }

    /**
     * 从屏幕坐标获取射线与平面的交点
     * @param {number} x - 屏幕 X 坐标（归一化设备坐标）
     * @param {number} y - 屏幕 Y 坐标（归一化设备坐标）
     * @param {THREE.Plane} plane - 目标平面
     * @returns {THREE.Vector3|null} 交点
     */
    intersectPlane(x, y, plane) {
        this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

        const intersection = new THREE.Vector3();
        const result = this.raycaster.ray.intersectPlane(plane, intersection);

        return result ? intersection : null;
    }

    /**
     * 将屏幕坐标转换为归一化设备坐标
     * @param {number} screenX - 屏幕 X 坐标
     * @param {number} screenY - 屏幕 Y 坐标
     * @param {HTMLElement} container - 容器元素
     * @returns {THREE.Vector2} 归一化设备坐标
     */
    static screenToNDC(screenX, screenY, container) {
        const rect = container.getBoundingClientRect();
        return new THREE.Vector2(
            ((screenX - rect.left) / rect.width) * 2 - 1,
            -((screenY - rect.top) / rect.height) * 2 + 1
        );
    }
}
