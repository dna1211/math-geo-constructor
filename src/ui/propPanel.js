/**
 * 属性面板模块
 * 管理属性面板的 UI 更新和事件绑定
 */

import { escapeHtml } from './utils.js';

export class PropPanel {
    constructor(store, bus) {
        this.store = store;
        this.bus = bus;

        // DOM 元素
        this.content = document.getElementById('prop-content');

        // 绑定事件
        this.bindEvents();
    }

    /**
     * 绑定事件监听
     */
    bindEvents() {
        this.bus.on('select:changed', ({ selected }) => {
            this.update(selected);
        });

        this.bus.on('object:deleted', ({ name }) => {
            // 如果删除的是当前选中的对象，清空属性面板
            // 注意：这里需要外部传入 selector 来检查
            this.update(null);
        });
    }

    /**
     * 更新属性面板
     * @param {string|null} name - 对象名称，null 表示清空
     */
    update(name) {
        if (!this.content) return;

        if (!name) {
            this.content.innerHTML = '<p class="placeholder">选择对象查看属性</p>';
            return;
        }

        const obj = this.store.get(name);
        if (!obj) return;

        let html = '';

        // 基本信息（转义防止 XSS）
        html += `<div class="prop-row"><label>名称</label><input type="text" value="${escapeHtml(obj.name)}" readonly></div>`;
        html += `<div class="prop-row"><label>类型</label><input type="text" value="${escapeHtml(obj.type)}" readonly></div>`;

        // 坐标（点对象）
        if (obj.type === 'point') {
            html += `<div class="prop-row"><label>X</label><input type="number" step="0.1" value="${obj.data.x}" data-prop="x"></div>`;
            html += `<div class="prop-row"><label>Y</label><input type="number" step="0.1" value="${obj.data.y}" data-prop="y"></div>`;
            html += `<div class="prop-row"><label>Z</label><input type="number" step="0.1" value="${obj.data.z}" data-prop="z"></div>`;
        }

        // 样式
        html += `<div class="prop-row"><label>颜色</label><input type="color" value="${obj.style.color || '#e0dcd2'}" data-prop="color"></div>`;

        // 线宽和虚线（仅线段、直线、射线）
        if (['segment', 'line', 'ray'].includes(obj.type)) {
            const lw = obj.style.lineWidth || 2;
            html += `<div class="prop-row"><label>线宽</label><input type="range" min="1" max="10" step="0.5" value="${lw}" data-prop="lineWidth"><span class="lw-value">${lw}</span></div>`;
            html += `<div class="prop-row"><label>虚线</label><input type="checkbox" ${obj.style.dash ? 'checked' : ''} data-prop="dash"></div>`;
        }

        html += `<div class="prop-row"><label>可见</label><input type="checkbox" ${obj.style.visible !== false ? 'checked' : ''} data-prop="visible"></div>`;

        this.content.innerHTML = html;

        // 绑定属性修改事件
        this.content.querySelectorAll('input[data-prop]').forEach(input => {
            const handleUpdate = (e) => {
                const prop = e.target.dataset.prop;
                let value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;

                if (['x', 'y', 'z'].includes(prop)) {
                    value = parseFloat(value);
                    this.store.update(name, { data: { [prop]: value } });
                } else if (prop === 'color') {
                    this.store.update(name, { style: { color: value } });
                } else if (prop === 'lineWidth') {
                    value = parseFloat(value);
                    this.store.update(name, { style: { lineWidth: value } });
                    // 更新滑块旁的数值显示
                    const span = e.target.parentElement.querySelector('.lw-value');
                    if (span) span.textContent = value;
                } else if (prop === 'dash') {
                    this.store.update(name, { style: { dash: value } });
                } else if (prop === 'visible') {
                    this.store.update(name, { style: { visible: value } });
                }
            };

            input.addEventListener('change', handleUpdate);
            // range 滑块实时更新
            if (input.type === 'range') {
                input.addEventListener('input', handleUpdate);
            }
        });
    }
}
