/**
 * UI 工具函数
 */

import * as THREE from 'three';

/**
 * HTML 转义（防止 XSS）
 * @param {string} str - 原始字符串
 * @returns {string} 转义后的字符串
 */
export function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * NDC 坐标转世界坐标（在 Z=0 平面上）
 * @param {number} ndcX - NDC X 坐标
 * @param {number} ndcY - NDC Y 坐标
 * @param {THREE.Camera} camera - 相机
 * @returns {{ x: number, y: number }} 世界坐标
 */
export function ndcToWorld(ndcX, ndcY, camera) {
    const vector = new THREE.Vector3(ndcX, ndcY, 0.5);
    vector.unproject(camera);

    const dir = vector.sub(camera.position).normalize();

    // 当相机视线平行于 XY 平面时 dir.z 接近 0，会产生除零
    if (Math.abs(dir.z) < 1e-6) {
        // 回退：使用相机到原点的距离作为默认距离
        const fallbackDist = camera.position.length();
        const pos = camera.position.clone().add(dir.multiplyScalar(fallbackDist));
        return { x: pos.x, y: pos.y };
    }

    const distance = -camera.position.z / dir.z;
    const pos = camera.position.clone().add(dir.multiplyScalar(distance));

    return { x: pos.x, y: pos.y };
}

/**
 * 获取可拾取对象列表
 * @param {THREE.Scene} scene - Three.js 场景
 * @returns {Array} 可拾取对象数组
 */
export function getPickableObjects(scene) {
    const objects = [];
    scene.traverse(child => {
        if (child.userData?.objectName) {
            objects.push(child);
        }
    });
    return objects;
}
