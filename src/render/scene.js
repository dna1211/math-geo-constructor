/**
 * 场景管理器
 * 负责 Three.js 场景、相机、灯光的初始化和管理
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class SceneManager {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.scene = new THREE.Scene();
        this.clock = new THREE.Clock();

        this.initRenderer();
        this.initCamera();
        this.initLights();
        this.initControls();
        this.initHelpers();

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    /** 初始化渲染器 */
    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: false
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x0b0b12);
        this.renderer.shadowMap.enabled = false;
    }

    /** 初始化相机 */
    initCamera() {
        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        const frustumSize = 10;

        // 正交投影（数学教材风格，无透视效果）
        this.camera = new THREE.OrthographicCamera(
            -frustumSize * aspect / 2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            -frustumSize / 2,
            0.1,
            1000
        );

        // 数学标准视角：从 Z 轴上方看向 XY 平面
        // X 向右，Y 向前（屏幕里），Z 向上
        // 顺时针旋转 90 度
        this.camera.position.set(10, 5, 8);
        this.camera.lookAt(0, 0, 0);
    }

    /** 初始化灯光 */
    initLights() {
        // 环境光
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);

        // 方向光（从上方照射）
        const directional = new THREE.DirectionalLight(0xffffff, 0.8);
        directional.position.set(10, -10, 20);  // Z 向上
        this.scene.add(directional);
    }

    /** 初始化控制器 */
    initControls() {
        // 数学标准：Z 轴向上
        this.camera.up.set(0, 0, 1);

        this.controls = new OrbitControls(this.camera, this.canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        this.controls.screenSpacePanning = true;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 100;
    }

    /** 初始化辅助对象（坐标轴、网格） */
    initHelpers() {
        // 数学标准右手坐标系：
        // X 轴：水平向右（红色）
        // Y 轴：水平向前/向屏幕里（绿色）
        // Z 轴：竖直向上（蓝色）

        // 自定义坐标轴（Three.js 默认 Y 向上，我们需要 Z 向上）
        this.axes = this.createCustomAxes(5);
        this.scene.add(this.axes);

        // 网格放在 XY 平面上（Z=0）
        this.grid = this.createXYGrid(20, 20);
        this.scene.add(this.grid);
    }

    /** 创建自定义坐标轴 */
    createCustomAxes(length) {
        const group = new THREE.Group();

        // X 轴 - 红色 - 水平向右
        const xAxisGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(length, 0, 0)
        ]);
        const xAxisMat = new THREE.LineBasicMaterial({ color: 0xff0000 });
        group.add(new THREE.Line(xAxisGeo, xAxisMat));
        // X 轴箭头
        const xArrow = this.createArrow(length, 0, 0, 0xff0000);
        group.add(xArrow);

        // Y 轴 - 绿色 - 水平向前（屏幕里）
        const yAxisGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, length, 0)
        ]);
        const yAxisMat = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        group.add(new THREE.Line(yAxisGeo, yAxisMat));
        // Y 轴箭头
        const yArrow = this.createArrow(0, length, 0, 0x00ff00);
        group.add(yArrow);

        // Z 轴 - 蓝色 - 竖直向上
        const zAxisGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, length)
        ]);
        const zAxisMat = new THREE.LineBasicMaterial({ color: 0x0000ff });
        group.add(new THREE.Line(zAxisGeo, zAxisMat));
        // Z 轴箭头
        const zArrow = this.createArrow(0, 0, length, 0x0000ff);
        group.add(zArrow);

        // 添加标签
        this.addAxisLabel(group, 'X', length + 0.5, 0, 0, 0xff0000);
        this.addAxisLabel(group, 'Y', 0, length + 0.5, 0, 0x00ff00);
        this.addAxisLabel(group, 'Z', 0, 0, length + 0.5, 0x0000ff);

        return group;
    }

    /** 创建箭头 */
    createArrow(x, y, z, color) {
        const arrowGroup = new THREE.Group();

        // 箭头头部（圆锥）
        // ConeGeometry 默认：底面在 Y=0，顶点在 Y=height/2
        const coneGeo = new THREE.ConeGeometry(0.15, 0.4, 8);
        const coneMat = new THREE.MeshBasicMaterial({ color });
        const cone = new THREE.Mesh(coneGeo, coneMat);

        // 根据方向旋转箭头
        if (x > 0) {
            // X 轴：向右，绕 Z 轴旋转 -90 度
            // 旋转后，顶点指向 X 正方向
            cone.rotation.z = -Math.PI / 2;
            // 调整位置，让底面在轴的末端
            cone.position.set(x - 0.2, y, z);
        } else if (y > 0) {
            // Y 轴：向前，不需要旋转
            // 顶点指向 Y 正方向
            cone.position.set(x, y - 0.2, z);
        } else if (z > 0) {
            // Z 轴：向上，绕 X 轴旋转 90 度
            // 旋转后，顶点指向 Z 正方向
            cone.rotation.x = Math.PI / 2;
            // 调整位置，让底面在轴的末端
            cone.position.set(x, y, z - 0.2);
        }

        arrowGroup.add(cone);
        return arrowGroup;
    }

    /** 添加坐标轴标签 */
    addAxisLabel(group, text, x, y, z, color) {
        // 使用 CSS2DRenderer 或 canvas 纹理
        // 这里使用简单的 canvas 纹理
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 32, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.set(x, y, z);
        sprite.scale.set(0.8, 0.8, 0.8);
        group.add(sprite);
    }

    /** 创建 XY 平面上的网格 */
    createXYGrid(size, divisions) {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const halfSize = size / 2;
        const step = size / divisions;

        for (let i = 0; i <= divisions; i++) {
            const pos = -halfSize + i * step;
            // 平行于 Y 轴的线（垂直）
            vertices.push(pos, -halfSize, 0, pos, halfSize, 0);
            // 平行于 X 轴的线（水平）
            vertices.push(-halfSize, pos, 0, halfSize, pos, 0);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

        const material = new THREE.LineBasicMaterial({
            color: 0x1a1a28,
            transparent: true,
            opacity: 0.5
        });

        return new THREE.LineSegments(geometry, material);
    }

    /** 窗口大小变化处理 */
    resize() {
        const container = this.canvas.parentElement;
        const width = container.clientWidth;
        const height = container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    /** 渲染循环 */
    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);

        // 渲染标签（如果有 labelRenderer）
        if (this.labelRenderer) {
            this.labelRenderer.render();
        }
    }

    /** 手动触发渲染 */
    render() {
        this.renderer.render(this.scene, this.camera);
    }

    /** 切换坐标轴显示 */
    toggleAxes() {
        this.axes.visible = !this.axes.visible;
    }

    /** 切换网格显示 */
    toggleGrid() {
        this.grid.visible = !this.grid.visible;
    }

    /** 切换投影方式 */
    toggleProjection() {
        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        const frustumSize = 10;
        const isOrtho = this.camera.isOrthographicCamera;

        if (isOrtho) {
            // 切换到透视投影
            this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
        } else {
            // 切换到正交投影
            this.camera = new THREE.OrthographicCamera(
                -frustumSize * aspect / 2,
                frustumSize * aspect / 2,
                frustumSize / 2,
                -frustumSize / 2,
                0.1,
                1000
            );
        }

        this.camera.position.set(10, 5, 8);
        this.camera.lookAt(0, 0, 0);
        this.camera.up.set(0, 0, 1);
        this.controls.object = this.camera;

        // 更新 labelRenderer 的相机引用
        if (this.labelRenderer) {
            this.labelRenderer.updateCamera(this.camera);
        }
    }
}
