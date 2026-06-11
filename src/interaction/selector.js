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

        // 监听对象删除，清理高亮状态防止材质泄漏
        this.bus.on('object:deleted', ({ name }) => {
            this.cleanupDeleted(name);
        });

        // 监听对象更新，清理旧材质引用（避免 renderUpdate 销毁重建后旧材质被 dispose 导致恢复失效）
        this.bus.on('object:updated', ({ name }) => {
            this.originalMaterials.delete(name);
            if (this.highlighted === name) {
                this.highlighted = null;
            }
        });
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

        // 根据材质类型选择高亮方式
        const isLine = mesh.material.isLineBasicMaterial ||
                       mesh.material.isLineDashedMaterial ||
                       mesh.material.isLineMaterial ||
                       mesh.material.type === 'LineMaterial';

        if (isLine) {
            // 线型对象：用颜色变亮方式高亮
            const highlightMat = mesh.material.clone();
            const origColor = mesh.material.color.clone();
            // 提亮颜色
            highlightMat.color = origColor.clone().lerp(new THREE.Color(0xffffff), 0.5);
            mesh.material = highlightMat;
        } else {
            // 面型/点型对象：使用 emissive 高亮
            const highlightMat = mesh.material.clone();
            highlightMat.emissive = new THREE.Color(0x55ccee);
            highlightMat.emissiveIntensity = 0.5;
            mesh.material = highlightMat;
        }

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

    /**
     * 清理被删除对象的高亮状态
     * @param {string} name - 被删除的对象名称
     */
    cleanupDeleted(name) {
        // 释放保存的原始材质
        const original = this.originalMaterials.get(name);
        if (original) {
            original.dispose();
            this.originalMaterials.delete(name);
        }

        // 如果删除的是当前选中对象，重置选中状态
        if (this.selected === name) {
            this.selected = null;
            this.highlighted = null;
        }
    }
}
