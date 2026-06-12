/**
 * 对象仓库
 * 管理所有几何对象，维护依赖关系
 */

import { createGeomObject } from './types.js';

export class ObjectStore {
    constructor(bus) {
        this.bus = bus;
        this.objects = new Map();

        // 依赖图
        this.dependents = new Map();  // A → Set{'seg1', 'E'}
        this.parents = new Map();     // E → Set{'A', 'B'}

        // 项目信息
        this.projectName = '未命名项目';
        this.createdTime = null;

        // 批量操作模式（抑制事件以提升性能）
        this._batchMode = false;
    }

    /**
     * 注册对象
     * @param {string} name - 对象名称
     * @param {Object} definition - 对象定义 { type, data, style?, parents?, stepId? }
     * @returns {Object} 注册的对象
     */
    register(name, definition) {
        if (this.objects.has(name)) {
            throw new Error(`对象 "${name}" 已存在`);
        }

        const obj = createGeomObject(
            name,
            definition.type,
            definition.data,
            definition.parents || []
        );

        // 合并自定义样式
        if (definition.style) {
            Object.assign(obj.style, definition.style);
        }

        // 传递重算函数
        if (definition.compute) {
            obj.compute = definition.compute;
        }

        // 设置步骤ID（用于步骤模式）
        obj.stepId = definition.stepId !== undefined ? definition.stepId : -1;

        this.objects.set(name, obj);

        // 建立依赖关系
        this.dependents.set(name, new Set());
        this.parents.set(name, new Set(obj.parents));

        for (const parent of obj.parents) {
            if (!this.objects.has(parent)) {
                console.warn(`对象 "${name}" 的父对象 "${parent}" 不存在`);
            }
            if (!this.dependents.has(parent)) {
                this.dependents.set(parent, new Set());
            }
            this.dependents.get(parent).add(name);
        }

        // 批量模式下抑制事件
        if (!this._batchMode) {
            this.bus.emit('object:created', { name, obj });
        }
        return obj;
    }

    /**
     * 注销对象
     * @param {string} name - 对象名称
     * @returns {Object} 被删除的对象
     */
    unregister(name) {
        const obj = this.objects.get(name);
        if (!obj) {
            throw new Error(`对象 "${name}" 不存在`);
        }

        // 清理子对象的父引用（防止依赖图不一致）
        const children = this.dependents.get(name);
        if (children) {
            for (const childName of children) {
                this.parents.get(childName)?.delete(name);
            }
        }

        // 断开依赖关系
        for (const parent of obj.parents) {
            this.dependents.get(parent)?.delete(name);
        }
        this.dependents.delete(name);
        this.parents.delete(name);

        this.objects.delete(name);
        this.bus.emit('object:deleted', { name, obj });
        return obj;
    }

    /**
     * 获取对象
     * @param {string} name - 对象名称
     * @returns {Object|undefined}
     */
    get(name) {
        return this.objects.get(name);
    }

    /**
     * 检查对象是否存在
     * @param {string} name - 对象名称
     * @returns {boolean}
     */
    has(name) {
        return this.objects.has(name);
    }

    /**
     * 获取所有对象名称
     * @returns {Array<string>}
     */
    getNames() {
        return Array.from(this.objects.keys());
    }

    /**
     * 获取所有对象
     * @returns {Map}
     */
    getAll() {
        return this.objects;
    }

    /**
     * 更新对象数据
     * @param {string} name - 对象名称
     * @param {Object} changes - 变更内容 { data?, style? }
     */
    update(name, changes) {
        const obj = this.objects.get(name);
        if (!obj) {
            throw new Error(`对象 "${name}" 不存在`);
        }

        // 记录更新前的状态（用于历史记录）
        const beforeData = changes.data ? { ...obj.data } : null;
        const beforeStyle = changes.style ? { ...obj.style } : null;

        if (changes.data) {
            Object.assign(obj.data, changes.data);
        }
        if (changes.style) {
            Object.assign(obj.style, changes.style);
        }

        this.bus.emit('object:updated', { name, obj, changes, beforeData, beforeStyle });

        // 自动触发依赖对象的重新渲染（如线段跟随点移动）
        const affected = this.getAffected(name);
        for (const depName of affected) {
            if (depName !== name) {
                const depObj = this.objects.get(depName);
                if (depObj) {
                    // 如果有重算函数，重新计算数据
                    if (depObj.compute) {
                        const newData = depObj.compute(this);
                        if (newData) {
                            Object.assign(depObj.data, newData);
                        }
                    }
                    this.bus.emit('object:updated', { name: depName, obj: depObj, changes: {}, _fromParent: true });
                }
            }
        }
    }

    /**
     * 获取受影响的对象（依赖图遍历）
     * @param {string} name - 起始对象名称
     * @returns {Array<string>} 按拓扑序排列的对象名称列表
     */
    getAffected(name) {
        const visited = new Set();
        const result = [];

        const dfs = (current) => {
            if (visited.has(current)) return;
            visited.add(current);

            const deps = this.dependents.get(current);
            if (deps) {
                for (const dep of deps) {
                    dfs(dep);
                }
            }

            result.push(current);
        };

        dfs(name);
        return result;
    }

    /**
     * 序列化所有对象
     * @returns {Object} 序列化数据
     */
    serialize() {
        const data = {};
        for (const [name, obj] of this.objects) {
            data[name] = {
                type: obj.type,
                data: { ...obj.data },
                style: { ...obj.style },
                parents: [...obj.parents]
            };
        }
        return data;
    }

    /**
     * 反序列化并加载对象
     * @param {Object} data - 序列化数据
     */
    deserialize(data) {
        this._batchMode = true;
        try {
            this.clear();
            for (const [name, obj] of Object.entries(data)) {
                this.register(name, obj);
            }
        } finally {
            this._batchMode = false;
        }
        // 批量完成后统一触发一次清空和重建通知
        this.bus.emit('store:cleared');
        for (const [name, obj] of this.objects) {
            this.bus.emit('object:created', { name, obj });
        }
    }

    /**
     * 清空所有对象
     */
    clear() {
        this.objects.clear();
        this.dependents.clear();
        this.parents.clear();
        this.bus.emit('store:cleared');
    }

    /**
     * 获取对象数量
     * @returns {number}
     */
    size() {
        return this.objects.size;
    }

    /**
     * 获取指定步骤的对象
     * @param {number} stepId - 步骤ID
     * @returns {Array} 对象数组
     */
    getObjectsByStep(stepId) {
        const result = [];
        for (const [name, obj] of this.objects) {
            if (obj.stepId === stepId) {
                result.push(obj);
            }
        }
        return result;
    }

    /**
     * 获取指定步骤及之前的所有对象
     * @param {number} stepId - 步骤ID
     * @returns {Array} 对象数组
     */
    getObjectsUpToStep(stepId) {
        const result = [];
        for (const [name, obj] of this.objects) {
            if (obj.stepId <= stepId) {
                result.push(obj);
            }
        }
        return result;
    }
}
