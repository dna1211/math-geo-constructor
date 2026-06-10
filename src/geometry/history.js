/**
 * 历史管理器
 * 管理撤销/重做栈
 */

export class HistoryManager {
    constructor(store, bus) {
        this.store = store;
        this.bus = bus;

        this.undoStack = [];
        this.redoStack = [];
        this.maxSize = 100;

        // 防止 undo/redo 期间触发新的历史记录
        this._isUndoRedoing = false;

        // 监听对象事件
        this.bus.on('object:created', ({ name, obj }) => this.recordCreate(name, obj));
        this.bus.on('object:deleted', ({ name, obj }) => this.recordDelete(name, obj));
        this.bus.on('object:updated', ({ name, obj, changes, beforeData, beforeStyle }) => this.recordUpdate(name, obj, changes, beforeData, beforeStyle));
    }

    /**
     * 记录创建操作
     */
    recordCreate(name, obj) {
        // 如果正在执行 undo/redo，跳过记录
        if (this._isUndoRedoing) return;

        this.undoStack.push({
            type: 'create',
            name,
            snapshot: this.serializeObject(obj)
        });
        this.redoStack = [];
        this.trimStack();
    }

    /**
     * 记录删除操作
     */
    recordDelete(name, obj) {
        // 如果正在执行 undo/redo，跳过记录
        if (this._isUndoRedoing) return;

        this.undoStack.push({
            type: 'delete',
            name,
            snapshot: this.serializeObject(obj)
        });
        this.redoStack = [];
        this.trimStack();
    }

    /**
     * 记录更新操作
     */
    recordUpdate(name, obj, changes, beforeData, beforeStyle) {
        // 如果正在执行 undo/redo，跳过记录
        if (this._isUndoRedoing) return;

        // 使用 store.update() 中记录的旧值
        const before = {};
        const after = {};

        if (changes.data) {
            before.data = beforeData;
            after.data = { ...changes.data };
        }
        if (changes.style) {
            before.style = beforeStyle;
            after.style = { ...changes.style };
        }

        this.undoStack.push({
            type: 'update',
            name,
            before,
            after
        });
        this.redoStack = [];
        this.trimStack();
    }

    /**
     * 撤销
     */
    undo() {
        if (this.undoStack.length === 0) return false;

        // 设置标志位，防止 undo/redo 期间触发新的历史记录
        this._isUndoRedoing = true;

        try {
            const record = this.undoStack.pop();
            this.redoStack.push(record);

            switch (record.type) {
                case 'create':
                    // 撤销创建 = 删除
                    this.store.unregister(record.name);
                    break;

                case 'delete':
                    // 撤销删除 = 恢复
                    this.store.register(record.name, record.snapshot);
                    break;

                case 'update':
                    // 撤销更新 = 恢复旧值
                    this.store.update(record.name, record.before);
                    break;
            }

            return true;
        } finally {
            this._isUndoRedoing = false;
        }
    }

    /**
     * 重做
     */
    redo() {
        if (this.redoStack.length === 0) return false;

        // 设置标志位，防止 undo/redo 期间触发新的历史记录
        this._isUndoRedoing = true;

        try {
            const record = this.redoStack.pop();
            this.undoStack.push(record);

            switch (record.type) {
                case 'create':
                    // 重做创建 = 重新创建
                    this.store.register(record.name, record.snapshot);
                    break;

                case 'delete':
                    // 重做删除 = 再次删除
                    this.store.unregister(record.name);
                    break;

                case 'update':
                    // 重做更新 = 应用新值
                    this.store.update(record.name, record.after);
                    break;
            }

            return true;
        } finally {
            this._isUndoRedoing = false;
        }
    }

    /**
     * 序列化对象
     */
    serializeObject(obj) {
        return {
            type: obj.type,
            data: { ...obj.data },
            style: { ...obj.style },
            parents: [...obj.parents]
        };
    }

    /**
     * 裁剪栈大小
     */
    trimStack() {
        if (this.undoStack.length > this.maxSize) {
            this.undoStack.shift();
        }
    }

    /**
     * 清空历史
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
    }

    /**
     * 是否可以撤销
     */
    canUndo() {
        return this.undoStack.length > 0;
    }

    /**
     * 是否可以重做
     */
    canRedo() {
        return this.redoStack.length > 0;
    }
}
