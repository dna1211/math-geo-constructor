/**
 * 标签渲染器
 * 使用 CSS2DRenderer 渲染标签
 */

import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export class LabelRenderer {
    constructor(scene, camera, container) {
        this.scene = scene;
        this.camera = camera;
        this.container = container;

        // 创建 CSS2D 渲染器
        this.renderer = new CSS2DRenderer();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.pointerEvents = 'none';
        container.appendChild(this.renderer.domElement);

        // 标签存储
        this.labels = new Map();

        // 监听窗口大小变化
        window.addEventListener('resize', () => this.resize());
    }

    /**
     * 创建标签
     * @param {string} name - 对象名称
     * @param {Object} obj - 几何对象
     * @param {THREE.Vector3} position - 标签位置
     * @param {string} color - 颜色
     */
    createLabel(name, obj, position, color) {
        // 如果已存在，先删除
        if (this.labels.has(name)) {
            this.removeLabel(name);
        }

        // 创建 DOM 元素（优先使用自定义标签）
        const div = document.createElement('div');
        div.className = 'geom-label';
        div.textContent = (obj && obj.style && obj.style.label) ? obj.style.label : name;
        div.style.color = color || '#ffffff';
        div.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        div.style.padding = '2px 6px';
        div.style.borderRadius = '4px';
        div.style.fontSize = '12px';
        div.style.fontFamily = 'monospace';
        div.style.whiteSpace = 'nowrap';
        div.style.pointerEvents = 'none';

        // 创建 CSS2D 对象
        const label = new CSS2DObject(div);
        label.position.copy(position);
        label.userData.objectName = name;

        this.scene.add(label);
        this.labels.set(name, label);

        return label;
    }

    /**
     * 更新标签位置
     * @param {string} name - 对象名称
     * @param {THREE.Vector3} position - 新位置
     */
    updateLabelPosition(name, position) {
        const label = this.labels.get(name);
        if (label) {
            label.position.copy(position);
        }
    }

    /**
     * 更新标签文字
     * @param {string} name - 对象名称
     * @param {string} text - 新标签文字
     */
    updateLabelText(name, text) {
        const label = this.labels.get(name);
        if (label && label.element) {
            label.element.textContent = text;
        }
    }

    /**
     * 删除标签
     * @param {string} name - 对象名称
     */
    removeLabel(name) {
        const label = this.labels.get(name);
        if (label) {
            this.scene.remove(label);
            this.labels.delete(name);
        }
    }

    /**
     * 清空所有标签
     */
    clearAll() {
        for (const [name, label] of this.labels) {
            this.scene.remove(label);
        }
        this.labels.clear();
    }

    /**
     * 更新相机
     * @param {THREE.Camera} camera - 新相机
     */
    updateCamera(camera) {
        this.camera = camera;
    }

    /**
     * 渲染
     */
    render() {
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * 窗口大小变化处理
     */
    resize() {
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }
}
