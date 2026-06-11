/**
 * 存储管理器
 * 管理 LocalStorage 自动保存和文件导入导出
 */

const STORAGE_KEY = 'geometry-tool-autosave';
const SAVE_INTERVAL = 2000;  // 2 秒节流

export class StorageManager {
    constructor(store, bus) {
        this.store = store;
        this.bus = bus;
        this.timer = null;

        // 监听对象变更事件
        this.bus.on('object:created', () => this.scheduleSave());
        this.bus.on('object:updated', () => this.scheduleSave());
        this.bus.on('object:deleted', () => this.scheduleSave());
        this.bus.on('store:cleared', () => this.scheduleSave());
    }

    /**
     * 节流保存
     */
    scheduleSave() {
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => this.saveToLocalStorage(), SAVE_INTERVAL);
    }

    /**
     * 保存到 localStorage
     */
    saveToLocalStorage() {
        const data = {
            name: this.store.projectName || '未命名项目',
            updated: new Date().toISOString(),
            objects: this.store.serialize()
        };

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('保存到 localStorage 失败:', e);
        }
    }

    /**
     * 从 localStorage 加载
     */
    loadFromLocalStorage() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.store.deserialize(data.objects);
                this.store.projectName = data.name;
                return data;
            } catch (e) {
                console.warn('从 localStorage 加载失败:', e);
                return null;
            }
        }
        return null;
    }

    /**
     * 清除 localStorage
     */
    clearLocalStorage() {
        localStorage.removeItem(STORAGE_KEY);
    }

    /**
     * 保存为 JSON 文件下载
     */
    saveToFile() {
        const data = {
            name: this.store.projectName || '未命名项目',
            created: this.store.createdTime || new Date().toISOString(),
            updated: new Date().toISOString(),
            objects: this.store.serialize()
        };

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.download = `${data.name}.json`;
        link.href = url;
        link.click();

        // 延迟释放 URL，防止慢浏览器下下载未开始就被释放
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    /**
     * 从 JSON 文件加载
     */
    loadFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (!data.objects) {
                        reject(new Error('无效的项目文件'));
                        return;
                    }
                    this.store.deserialize(data.objects);
                    this.store.projectName = data.name || '未命名项目';
                    resolve(data);
                } catch (err) {
                    reject(new Error('文件解析失败'));
                }
            };
            reader.onerror = () => reject(new Error('读取文件失败'));
            reader.readAsText(file);
        });
    }
}
