/**
 * 几何对象渲染器
 * 将几何对象转换为 Three.js 对象
 */

import * as THREE from 'three';

export class GeomRenderer {
    constructor(scene, store, bus, labelRenderer) {
        this.scene = scene;
        this.store = store;
        this.bus = bus;
        this.labelRenderer = labelRenderer;

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
            case 'line':
                mesh = this.createLine(obj);
                break;
            case 'ray':
                mesh = this.createRay(obj);
                break;
            case 'triangle':
                mesh = this.createTriangle(obj);
                break;
            case 'polygon':
                mesh = this.createPolygon(obj);
                break;
            case 'plane':
                mesh = this.createPlane(obj);
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

        // 删除标签
        if (this.labelRenderer) {
            this.labelRenderer.removeLabel(obj.name);
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

        // 清空标签
        if (this.labelRenderer) {
            this.labelRenderer.clearAll();
        }
    }

    /**
     * 创建点
     * 数学坐标系：X 右，Y 前，Z 上
     * Three.js 坐标系：X 右，Y 上，Z 前
     * 转换：math(x,y,z) -> three(x,z,y)
     * 但是用户输入 (0,2,0) 应该在 Y 轴上，所以实际转换是 math(x,y,z) -> three(x,y,z)
     */
    createPoint(obj) {
        const { x, y, z } = obj.data;

        // 点（球体）
        const geometry = new THREE.SphereGeometry(0.06, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: obj.style.color || '#e0dcd2'
        });
        const mesh = new THREE.Mesh(geometry, material);
        // 不交换，直接使用数学坐标
        mesh.position.set(x, y, z);
        mesh.userData.objectName = obj.name;
        mesh.userData.objectType = 'point';

        // 使用 LabelRenderer 创建标签
        if (this.labelRenderer) {
            const labelPos = new THREE.Vector3(x, y + 0.15, z);  // 在点的上方
            this.labelRenderer.createLabel(obj.name, obj, labelPos, obj.style.color || '#e0dcd2');
        }

        return mesh;
    }

    /**
     * 创建线段
     */
    createSegment(obj) {
        const fromObj = this.store.get(obj.data.from);
        const toObj = this.store.get(obj.data.to);

        if (!fromObj || !toObj) return null;

        const points = [
            new THREE.Vector3(fromObj.data.x, fromObj.data.y, fromObj.data.z),
            new THREE.Vector3(toObj.data.x, toObj.data.y, toObj.data.z)
        ];

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: obj.style.color || '#e0dcd2',
            linewidth: obj.style.lineWidth || 2
        });

        return new THREE.Line(geometry, material);
    }

    /**
     * 创建无限直线
     */
    createLine(obj) {
        const fromObj = this.store.get(obj.data.from);
        const toObj = this.store.get(obj.data.to);

        if (!fromObj || !toObj) return null;

        const from = new THREE.Vector3(fromObj.data.x, fromObj.data.y, fromObj.data.z);
        const to = new THREE.Vector3(toObj.data.x, toObj.data.y, toObj.data.z);
        const dir = new THREE.Vector3().subVectors(to, from).normalize();

        const extend = 100;
        const points = [
            new THREE.Vector3().subVectors(from, dir.clone().multiplyScalar(extend)),
            new THREE.Vector3().addVectors(from, dir.clone().multiplyScalar(extend))
        ];

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: obj.style.color || '#e0dcd2',
            linewidth: obj.style.lineWidth || 2
        });

        return new THREE.Line(geometry, material);
    }

    /**
     * 创建射线
     */
    createRay(obj) {
        const originObj = this.store.get(obj.data.origin);
        const throughObj = this.store.get(obj.data.through);

        if (!originObj || !throughObj) return null;

        const origin = new THREE.Vector3(originObj.data.x, originObj.data.y, originObj.data.z);
        const through = new THREE.Vector3(throughObj.data.x, throughObj.data.y, throughObj.data.z);
        const dir = new THREE.Vector3().subVectors(through, origin).normalize();

        const extend = 100;
        const points = [
            origin,
            new THREE.Vector3().addVectors(origin, dir.clone().multiplyScalar(extend))
        ];

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: obj.style.color || '#e0dcd2',
            linewidth: obj.style.lineWidth || 2
        });

        return new THREE.Line(geometry, material);
    }

    /**
     * 创建平面
     */
    createPlane(obj) {
        let normal, point;

        if (obj.data.points) {
            const points = obj.data.points.map(name => {
                const p = this.store.get(name);
                if (!p) return null;
                return new THREE.Vector3(p.data.x, p.data.y, p.data.z);
            });

            if (points.some(p => !p)) return null;

            const v1 = new THREE.Vector3().subVectors(points[1], points[0]);
            const v2 = new THREE.Vector3().subVectors(points[2], points[0]);
            normal = new THREE.Vector3().crossVectors(v1, v2).normalize();
            point = points[0];
        } else {
            const { a, b, c, d } = obj.data;
            normal = new THREE.Vector3(a, b, c).normalize();

            // 选择非零系数计算平面上的点，避免除零
            if (Math.abs(c) > 1e-6) {
                point = new THREE.Vector3(0, 0, -d / c);
            } else if (Math.abs(b) > 1e-6) {
                point = new THREE.Vector3(0, -d / b, 0);
            } else if (Math.abs(a) > 1e-6) {
                point = new THREE.Vector3(-d / a, 0, 0);
            } else {
                // 法向量退化，使用原点
                point = new THREE.Vector3(0, 0, 0);
            }
        }

        const geometry = new THREE.PlaneGeometry(10, 10);
        const material = new THREE.MeshStandardMaterial({
            color: obj.style.color || '#c9a04a',
            opacity: obj.style.opacity || 0.2,
            transparent: true,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(point);
        mesh.lookAt(point.clone().add(normal));

        return mesh;
    }

    /**
     * 创建三角形
     */
    createTriangle(obj) {
        const points = obj.data.points.map(name => {
            const p = this.store.get(name);
            if (!p) return null;
            return new THREE.Vector3(p.data.x, p.data.y, p.data.z);
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
            return new THREE.Vector3(p.data.x, p.data.y, p.data.z);
        });

        if (points.some(p => !p)) return null;

        // 使用 BufferGeometry 构建 3D 多边形（三角扇）
        const geometry = new THREE.BufferGeometry();
        const vertices = [];

        // 使用第一个顶点作为中心，构建三角扇
        const center = points[0];
        for (let i = 1; i < points.length - 1; i++) {
            vertices.push(
                center.x, center.y, center.z,
                points[i].x, points[i].y, points[i].z,
                points[i + 1].x, points[i + 1].y, points[i + 1].z
            );
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
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
