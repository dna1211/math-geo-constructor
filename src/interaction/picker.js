/**
 * 3D 拾取器
 * 封装 Raycaster，实现从屏幕坐标拾取对象
 */

import * as THREE from 'three';

export class Picker {
    constructor(camera, scene, config = {}) {
        this.camera = camera;
        this.scene = scene;
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

        // 对于其他对象，使用射线检测
        const intersects = this.raycaster.intersectObjects(targets, true);
        if (intersects.length > 0) {
            // 返回最近的对象
            let obj = intersects[0].object;
            // 向上查找带有 objectName 的父对象
            while (obj && !obj.userData?.objectName) {
                obj = obj.parent;
            }
            return obj;
        }

        return null;
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
