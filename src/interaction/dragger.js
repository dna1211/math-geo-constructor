/**
 * 拖拽控制器
 * 实现点的拖拽和依赖更新
 */

import * as THREE from 'three';
import { Picker } from './picker.js';

export class Dragger {
    constructor(store, picker, bus, config = {}) {
        this.store = store;
        this.picker = picker;
        this.bus = bus;

        this.isDragging = false;
        this.dragTarget = null;
        this.dragPlane = new THREE.Plane();

        // 默认拖拽平面
        this.defaultPlane = config.defaultPlane || 'xz';
    }

    /**
     * 获取拖拽目标名称
     * @returns {string|null}
     */
    getDragTarget() {
        return this.dragTarget;
    }

    /**
     * 开始拖拽
     * @param {string} name - 对象名称
     * @param {number} x - 屏幕 X 坐标
     * @param {number} y - 屏幕 Y 坐标
     * @param {HTMLElement} container - 容器元素
     */
    startDrag(name, x, y, container) {
        const obj = this.store.get(name);
        if (!obj || obj.type !== 'point') return;

        this.isDragging = true;
        this.dragTarget = name;

        // 设置拖拽平面
        this.setDragPlane(obj);

        this.bus.emit('drag:start', { name, position: { ...obj.data } });
    }

    /**
     * 拖拽中
     * @param {number} x - 屏幕 X 坐标
     * @param {number} y - 屏幕 Y 坐标
     * @param {HTMLElement} container - 容器元素
     */
    drag(x, y, container) {
        if (!this.isDragging || !this.dragTarget) return;

        const ndc = Picker.screenToNDC(x, y, container);
        const intersection = this.picker.intersectPlane(ndc.x, ndc.y, this.dragPlane);

        if (intersection) {
            // 直接使用 Three.js 坐标（不再交换）
            const newPos = {
                x: intersection.x,
                y: intersection.y,
                z: intersection.z
            };

            // 更新点的位置
            this.store.update(this.dragTarget, { data: newPos });

            this.bus.emit('drag:move', { name: this.dragTarget, position: newPos });
        }
    }

    /**
     * 结束拖拽
     */
    endDrag() {
        if (!this.isDragging) return;

        const name = this.dragTarget;
        const obj = this.store.get(name);

        this.isDragging = false;
        this.dragTarget = null;

        if (obj) {
            this.bus.emit('drag:end', { name, position: { ...obj.data } });
        }
    }

    /**
     * 设置拖拽平面
     * @param {Object} obj - 被拖拽的对象
     */
    setDragPlane(obj) {
        const { x, y, z } = obj.data;

        switch (this.defaultPlane) {
            case 'xy':
                // XY 平面（Z = 常数）
                this.dragPlane.setFromNormalAndCoplanarPoint(
                    new THREE.Vector3(0, 0, 1),  // 法向量：Z 轴
                    new THREE.Vector3(x, y, z)    // 平面上的点
                );
                break;
            case 'xz':
                // XZ 平面（Y = 常数）
                this.dragPlane.setFromNormalAndCoplanarPoint(
                    new THREE.Vector3(0, 1, 0),  // 法向量：Y 轴
                    new THREE.Vector3(x, y, z)    // 平面上的点
                );
                break;
            case 'yz':
                // YZ 平面（X = 常数）
                this.dragPlane.setFromNormalAndCoplanarPoint(
                    new THREE.Vector3(1, 0, 0),  // 法向量：X 轴
                    new THREE.Vector3(x, y, z)    // 平面上的点
                );
                break;
        }
    }

    /**
     * 检查是否正在拖拽
     * @returns {boolean}
     */
    isDraggingNow() {
        return this.isDragging;
    }
}
