/**
 * 选择管理器
 * 管理对象的选中状态和高亮效果
 */

import * as THREE from 'three';

export class Selector {
    constructor(store, bus) {
        this.store = store;
        this.bus = bus;
        this.selected = null;
        this.highlighted = null;

        // 保存原始材质，用于恢复
        this.originalMaterials = new Map();
    }

    /**
     * 选中对象
     * @param {string} name - 对象名称
     */
    select(name) {
        const previous = this.selected;

        // 取消之前的选中
        if (previous) {
            this.unhighlight(previous);
        }

        this.selected = name;

        if (name) {
            this.highlight(name);
        }

        this.bus.emit('select:changed', { selected: name, previous });
    }

    /**
     * 取消选中
     */
    clearSelection() {
        const previous = this.selected;

        if (previous) {
            this.unhighlight(previous);
        }

        this.selected = null;
        this.bus.emit('select:cleared', { previous });
    }

    /**
     * 获取当前选中的对象名称
     * @returns {string|null}
     */
    getSelected() {
        return this.selected;
    }

    /**
     * 高亮对象
     * @param {string} name - 对象名称
     */
    highlight(name) {
        const obj = this.store.get(name);
        if (!obj || !obj.renderRef) return;

        const mesh = obj.renderRef;

        // 保存原始材质
        this.originalMaterials.set(name, mesh.material);

        // 创建高亮材质
        const highlightMat = mesh.material.clone();
        highlightMat.emissive = new THREE.Color(0x55ccee);
        highlightMat.emissiveIntensity = 0.5;

        mesh.material = highlightMat;
        this.highlighted = name;

        // 点对象放大
        if (obj.type === 'point') {
            mesh.scale.set(1.3, 1.3, 1.3);
        }
    }

    /**
     * 取消高亮
     * @param {string} name - 对象名称
     */
    unhighlight(name) {
        const obj = this.store.get(name);
        if (!obj || !obj.renderRef) return;

        const mesh = obj.renderRef;

        // 恢复原始材质
        const original = this.originalMaterials.get(name);
        if (original) {
            mesh.material.dispose();
            mesh.material = original;
            this.originalMaterials.delete(name);
        }

        // 恢复点大小
        if (obj.type === 'point') {
            mesh.scale.set(1, 1, 1);
        }

        this.highlighted = null;
    }

    /**
     * 检查对象是否被选中
     * @param {string} name - 对象名称
     * @returns {boolean}
     */
    isSelected(name) {
        return this.selected === name;
    }
}
