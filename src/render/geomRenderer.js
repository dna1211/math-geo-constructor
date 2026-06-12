/**
 * 几何对象渲染器
 * 将几何对象转换为 Three.js 对象
 */

import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { getThemeManager } from '../utils/themeManager.js';

export class GeomRenderer {
    constructor(scene, store, bus, labelRenderer, renderer) {
        this.scene = scene;
        this.store = store;
        this.bus = bus;
        this.labelRenderer = labelRenderer;
        this.renderer = renderer;
        this.themeManager = getThemeManager();

        // 监听对象事件
        this.bus.on('object:created', ({ name, obj }) => this.renderCreate(obj));
        this.bus.on('object:updated', ({ name, obj }) => this.renderUpdate(obj));
        this.bus.on('object:deleted', ({ name, obj }) => this.renderRemove(obj));
        this.bus.on('store:cleared', () => this.clearAll());

        // 监听主题变化，更新所有对象颜色
        this.bus.on('theme:changed', ({ theme }) => this.updateAllColorsForTheme());
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
            mesh.visible = obj.style.visible !== false;
            obj.renderRef = mesh;
            this.scene.add(mesh);
        }
    }

    /**
     * 更新对象
     */
    renderUpdate(obj) {
        // 更新标签文字（如果 style.label 变化）
        if (this.labelRenderer) {
            const labelText = obj.style.label || obj.name;
            this.labelRenderer.updateLabelText(obj.name, labelText);
        }

        // 点对象：直接更新位置，避免销毁重建的开销
        if (obj.type === 'point' && obj.renderRef) {
            obj.renderRef.position.set(obj.data.x, obj.data.y, obj.data.z);
            obj.renderRef.visible = obj.style.visible !== false;
            if (this.labelRenderer) {
                const labelPos = new THREE.Vector3(obj.data.x, obj.data.y + 0.15, obj.data.z);
                this.labelRenderer.updateLabelPosition(obj.name, labelPos);
            }
            return;
        }

        // 其他对象：销毁重建
        this.renderRemove(obj);
        this.renderCreate(obj);

        // 同步可见性
        if (obj.renderRef) {
            obj.renderRef.visible = obj.style.visible !== false;
        }
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
        const defaultColor = this.themeManager ? this.themeManager.getPointColor() : '#e0dcd2';
        const material = new THREE.MeshStandardMaterial({
            color: obj.style.color || defaultColor
        });
        const mesh = new THREE.Mesh(geometry, material);
        // 不交换，直接使用数学坐标
        mesh.position.set(x, y, z);
        mesh.userData.objectName = obj.name;
        mesh.userData.objectType = 'point';

        // 使用 LabelRenderer 创建标签
        if (this.labelRenderer) {
            const labelPos = new THREE.Vector3(x, y + 0.15, z);  // 在点的上方
            this.labelRenderer.createLabel(obj.name, obj, labelPos, obj.style.color || defaultColor);
        }

        return mesh;
    }

    /**
     * 创建线条材质（LineMaterial，支持可变线宽）
     */
    createLineMaterial(obj) {
        const size = new THREE.Vector2();
        this.renderer.getSize(size);
        const defaultColor = this.themeManager ? this.themeManager.getLineColor() : '#e0dcd2';
        const material = new LineMaterial({
            color: new THREE.Color(obj.style.color || defaultColor).getHex(),
            linewidth: obj.style.lineWidth || 2,
            resolution: size,
            dashed: obj.style.dash === true,
            dashSize: 0.15,
            gapSize: 0.08,
        });
        return material;
    }

    /**
     * 创建线段
     */
    createSegment(obj) {
        const fromObj = this.store.get(obj.data.from);
        const toObj = this.store.get(obj.data.to);

        if (!fromObj || !toObj) return null;

        const geometry = new LineGeometry();
        geometry.setPositions([
            fromObj.data.x, fromObj.data.y, fromObj.data.z,
            toObj.data.x, toObj.data.y, toObj.data.z
        ]);
        const material = this.createLineMaterial(obj);
        const line = new Line2(geometry, material);
        line.computeLineDistances();
        return line;
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
        const p1 = new THREE.Vector3().subVectors(from, dir.clone().multiplyScalar(extend));
        const p2 = new THREE.Vector3().addVectors(from, dir.clone().multiplyScalar(extend));

        const geometry = new LineGeometry();
        geometry.setPositions([p1.x, p1.y, p1.z, p2.x, p2.y, p2.z]);
        const material = this.createLineMaterial(obj);
        const line = new Line2(geometry, material);
        line.computeLineDistances();
        return line;
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
        const end = new THREE.Vector3().addVectors(origin, dir.clone().multiplyScalar(extend));

        const geometry = new LineGeometry();
        geometry.setPositions([origin.x, origin.y, origin.z, end.x, end.y, end.z]);
        const material = this.createLineMaterial(obj);
        const line = new Line2(geometry, material);
        line.computeLineDistances();
        return line;
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
        const defaultColor = this.themeManager ? this.themeManager.getFaceColor() : '#c9a04a';
        const material = new THREE.MeshStandardMaterial({
            color: obj.style.color || defaultColor,
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

        const defaultColor = this.themeManager ? this.themeManager.getFaceColor() : '#c9a04a';
        const material = new THREE.MeshStandardMaterial({
            color: obj.style.color || defaultColor,
            opacity: obj.style.opacity || 0.3,
            transparent: true,
            side: THREE.DoubleSide
        });

        // 面 + 边线
        const group = new THREE.Group();
        group.add(new THREE.Mesh(geometry, material));

        const edgeGeo = new THREE.EdgesGeometry(geometry);
        const edgeMat = new THREE.LineBasicMaterial({ color: obj.style.color || defaultColor });
        group.add(new THREE.LineSegments(edgeGeo, edgeMat));

        return group;
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

        // 投影到 2D 进行三角化（支持凹多边形）
        // 计算多边形所在平面的法向量
        const normal = new THREE.Vector3();
        if (points.length >= 3) {
            const v1 = new THREE.Vector3().subVectors(points[1], points[0]);
            const v2 = new THREE.Vector3().subVectors(points[2], points[0]);
            normal.crossVectors(v1, v2).normalize();
        }

        // 构建 2D 投影坐标
        // 选择投影轴：法向量分量最大的轴被丢弃
        const absNormal = new THREE.Vector3(Math.abs(normal.x), Math.abs(normal.y), Math.abs(normal.z));
        let projPoints;
        if (absNormal.z >= absNormal.x && absNormal.z >= absNormal.y) {
            // 投影到 XY 平面
            projPoints = points.map(p => new THREE.Vector2(p.x, p.y));
        } else if (absNormal.y >= absNormal.x) {
            // 投影到 XZ 平面
            projPoints = points.map(p => new THREE.Vector2(p.x, p.z));
        } else {
            // 投影到 YZ 平面
            projPoints = points.map(p => new THREE.Vector2(p.y, p.z));
        }

        // 使用 Three.js 的 ShapeUtils 进行耳切法三角化
        const indices = THREE.ShapeUtils.triangulateShape(projPoints, []);

        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        for (const tri of indices) {
            for (const idx of tri) {
                vertices.push(points[idx].x, points[idx].y, points[idx].z);
            }
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.computeVertexNormals();

        const defaultColor = this.themeManager ? this.themeManager.getFaceColor() : '#c9a04a';
        const material = new THREE.MeshStandardMaterial({
            color: obj.style.color || defaultColor,
            opacity: obj.style.opacity || 0.3,
            transparent: true,
            side: THREE.DoubleSide
        });

        // 面 + 边线
        const group = new THREE.Group();
        group.add(new THREE.Mesh(geometry, material));

        const edgeGeo = new THREE.EdgesGeometry(geometry);
        const edgeMat = new THREE.LineBasicMaterial({ color: obj.style.color || defaultColor });
        group.add(new THREE.LineSegments(edgeGeo, edgeMat));

        return group;
    }

    /**
     * 主题变化时更新所有对象的颜色
     * 只更新使用默认颜色的对象（用户自定义颜色的对象保持不变）
     */
    updateAllColorsForTheme() {
        if (!this.themeManager) return;

        const defaultPointColor = this.themeManager.getPointColor();
        const defaultLineColor = this.themeManager.getLineColor();
        const defaultFaceColor = this.themeManager.getFaceColor();

        // 遍历所有存储的对象
        this.store.getAll().forEach(obj => {
            if (!obj.renderRef) return;

            // 检查对象是否使用默认颜色（非用户自定义）
            const isDefaultColor = this.isUsingDefaultColor(obj);
            if (!isDefaultColor) return;

            // 根据对象类型更新颜色
            const newColor = this.getDefaultColorForType(obj.type);
            if (!newColor) return;

            // 更新对象样式的默认颜色
            obj.style.color = newColor;

            // 更新渲染对象的颜色
            this.updateObjectColor(obj, newColor);
        });
    }

    /**
     * 判断对象是否使用默认颜色
     */
    isUsingDefaultColor(obj) {
        // 如果对象没有设置颜色，使用默认
        if (!obj.style.color) return true;

        // 检查是否匹配任一主题的默认颜色
        const darkColors = ['#e0dcd2', '#c9a04a'];
        const lightColors = ['#1a1a28', '#b08030'];
        return darkColors.includes(obj.style.color) || lightColors.includes(obj.style.color);
    }

    /**
     * 获取对象类型的默认颜色
     */
    getDefaultColorForType(type) {
        if (!this.themeManager) return null;

        switch (type) {
            case 'point':
                return this.themeManager.getPointColor();
            case 'segment':
            case 'line':
            case 'ray':
                return this.themeManager.getLineColor();
            case 'triangle':
            case 'polygon':
            case 'plane':
                return this.themeManager.getFaceColor();
            default:
                return this.themeManager.getPointColor();
        }
    }

    /**
     * 更新单个对象的渲染颜色
     */
    updateObjectColor(obj, newColor) {
        const mesh = obj.renderRef;
        if (!mesh) return;

        // Group 对象（如三角形、多边形的面+边线）
        if (mesh.isGroup) {
            mesh.children.forEach(child => {
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => {
                            if (m.color) m.color.set(newColor);
                        });
                    } else if (child.material.color) {
                        child.material.color.set(newColor);
                    }
                }
            });
        } else if (mesh.material) {
            // 单个材质对象
            if (mesh.material.isLineMaterial) {
                // LineMaterial 需要使用 set 方法
                mesh.material.color.set(new THREE.Color(newColor).getHex());
            } else if (mesh.material.color) {
                mesh.material.color.set(newColor);
            }
        }
    }

    /**
     * 释放对象资源
     */
    disposeObject(obj) {
        if (obj.geometry) {
            // LineGeometry 需要额外清理 instance buffer
            if (obj.geometry.disposePositions) {
                obj.geometry.disposePositions();
                obj.geometry.disposeColors();
            }
            obj.geometry.dispose();
        }
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(m => m.dispose());
            } else {
                obj.material.dispose();
            }
        }
    }
}
