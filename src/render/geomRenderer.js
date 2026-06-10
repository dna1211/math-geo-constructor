/**
 * 几何对象渲染器
 * 将几何对象转换为 Three.js 对象
 */

import * as THREE from 'three';

export class GeomRenderer {
    constructor(scene, store, bus) {
        this.scene = scene;
        this.store = store;
        this.bus = bus;

        // 监听对象事件
        this.bus.on('object:created', ({ name, obj }) => this.renderCreate(obj));
        this.bus.on('object:updated', ({ name, obj }) => this.renderUpdate(obj));
        this.bus.on('object:deleted', ({ name, obj }) => this.renderRemove(obj));
        this.bus.on('store:cleared', () => this.clearAll());
    }

    /**
     * 创建对象的 Three.js 表示
     */
    renderCreate(obj) {
        let mesh;

        switch (obj.type) {
            case 'point':
                mesh = this.createPoint(obj);
                break;
            case 'segment':
                mesh = this.createSegment(obj);
                break;
            case 'triangle':
                mesh = this.createTriangle(obj);
                break;
            case 'polygon':
                mesh = this.createPolygon(obj);
                break;
            default:
                console.warn(`未知的对象类型: ${obj.type}`);
                return;
        }

        if (mesh) {
            mesh.userData.objectName = obj.name;
            obj.renderRef = mesh;
            this.scene.add(mesh);
        }
    }

    /**
     * 更新对象
     */
    renderUpdate(obj) {
        this.renderRemove(obj);
        this.renderCreate(obj);
    }

    /**
     * 删除对象
     */
    renderRemove(obj) {
        if (obj.renderRef) {
            this.scene.remove(obj.renderRef);
            this.disposeObject(obj.renderRef);
            obj.renderRef = null;
        }
    }

    /**
     * 清空所有渲染对象
     */
    clearAll() {
        const toRemove = [];
        this.scene.traverse(child => {
            if (child.userData.objectName) {
                toRemove.push(child);
            }
        });
        toRemove.forEach(obj => {
            this.scene.remove(obj);
            this.disposeObject(obj);
        });
    }

    /**
     * 创建点
     * 数学坐标系：X 右，Y 前，Z 上
     * Three.js 坐标系：X 右，Y 上，Z 前
     * 转换：math(x,y,z) -> three(x,z,y)
     */
    createPoint(obj) {
        const { x, y, z } = obj.data;
        const group = new THREE.Group();

        // 点（球体）
        const geometry = new THREE.SphereGeometry(0.06, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: obj.style.color || '#e0dcd2'
        });
        const mesh = new THREE.Mesh(geometry, material);
        group.add(mesh);

        // 标签
        const label = this.createLabel(obj.name || obj.style.label, obj.style.color || '#e0dcd2');
        label.position.set(0, 0.15, 0);  // 在点的上方
        group.add(label);

        group.position.set(x, z, y);  // 交换 Y 和 Z
        return group;
    }

    /**
     * 创建标签（Sprite）
     */
    createLabel(text, color) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // 背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.roundRect(0, 0, 128, 64, 8);
        ctx.fill();

        // 文字
        ctx.fillStyle = color;
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 64, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(0.5, 0.25, 1);
        return sprite;
    }

    /**
     * 创建线段
     */
    createSegment(obj) {
        const fromObj = this.store.get(obj.data.from);
        const toObj = this.store.get(obj.data.to);

        if (!fromObj || !toObj) return null;

        // 交换 Y 和 Z
        const points = [
            new THREE.Vector3(fromObj.data.x, fromObj.data.z, fromObj.data.y),
            new THREE.Vector3(toObj.data.x, toObj.data.z, toObj.data.y)
        ];

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: obj.style.color || '#e0dcd2',
            linewidth: obj.style.lineWidth || 2
        });

        return new THREE.Line(geometry, material);
    }

    /**
     * 创建三角形
     */
    createTriangle(obj) {
        const points = obj.data.points.map(name => {
            const p = this.store.get(name);
            if (!p) return null;
            // 交换 Y 和 Z
            return new THREE.Vector3(p.data.x, p.data.z, p.data.y);
        });

        if (points.some(p => !p)) return null;

        const geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([
            points[0].x, points[0].y, points[0].z,
            points[1].x, points[1].y, points[1].z,
            points[2].x, points[2].y, points[2].z
        ]);
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            color: obj.style.color || '#c9a04a',
            opacity: obj.style.opacity || 0.3,
            transparent: true,
            side: THREE.DoubleSide
        });

        return new THREE.Mesh(geometry, material);
    }

    /**
     * 创建多边形
     */
    createPolygon(obj) {
        const points = obj.data.points.map(name => {
            const p = this.store.get(name);
            if (!p) return null;
            // 交换 Y 和 Z
            return { x: p.data.x, y: p.data.z, z: p.data.y };
        });

        if (points.some(p => !p)) return null;

        // ShapeGeometry 在 XY 平面上创建
        const shape = new THREE.Shape();
        shape.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            shape.lineTo(points[i].x, points[i].y);
        }
        shape.closePath();

        const geometry = new THREE.ShapeGeometry(shape);

        // 调整 Z 坐标（所有点应该在同一 Z 平面上）
        const posAttr = geometry.getAttribute('position');
        const z = points[0].z;
        for (let i = 0; i < posAttr.count; i++) {
            posAttr.setZ(i, z);
        }

        const material = new THREE.MeshStandardMaterial({
            color: obj.style.color || '#c9a04a',
            opacity: obj.style.opacity || 0.3,
            transparent: true,
            side: THREE.DoubleSide
        });

        return new THREE.Mesh(geometry, material);
    }

    /**
     * 释放对象资源
     */
    disposeObject(obj) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(m => m.dispose());
            } else {
                obj.material.dispose();
            }
        }
    }
}
