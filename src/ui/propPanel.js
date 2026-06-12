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

        // 只读信息（名称、类型）- 同一行显示
        html += `<div class="prop-info-row"><span class="prop-info"><span class="label">名称</span><span class="value">${escapeHtml(obj.name)}</span></span><span class="prop-info"><span class="label">类型</span><span class="value">${escapeHtml(obj.type)}</span></span></div>`;

        // 坐标（点对象）- 横向排列
        if (obj.type === 'point') {
            html += `
                <div class="prop-coords">
                    <div class="coord-item">
                        <label>X</label>
                        <input type="number" step="0.1" value="${obj.data.x}" data-prop="x">
                    </div>
                    <div class="coord-item">
                        <label>Y</label>
                        <input type="number" step="0.1" value="${obj.data.y}" data-prop="y">
                    </div>
                    <div class="coord-item">
                        <label>Z</label>
                        <input type="number" step="0.1" value="${obj.data.z}" data-prop="z">
                    </div>
                </div>
            `;
        }

        // 样式选项 - 横向排列
        html += `
            <div class="prop-style">
                <div class="style-item">
                    <label>颜色</label>
                    <input type="color" value="${obj.style.color || '#e0dcd2'}" data-prop="color">
                </div>
                <div class="style-item">
                    <label>可见</label>
                    <input type="checkbox" ${obj.style.visible !== false ? 'checked' : ''} data-prop="visible">
                </div>
        `;

        // 虚线（仅线段、直线、射线）
        if (['segment', 'line', 'ray'].includes(obj.type)) {
            html += `
                <div class="style-item">
                    <label>虚线</label>
                    <input type="checkbox" ${obj.style.dash ? 'checked' : ''} data-prop="dash">
                </div>
            `;
        }

        html += '</div>';

        // 线宽（仅线段、直线、射线）
        if (['segment', 'line', 'ray'].includes(obj.type)) {
            const lw = obj.style.lineWidth || 2;
            html += `
                <div class="prop-linewidth">
                    <label>线宽</label>
                    <input type="range" min="1" max="10" step="0.5" value="${lw}" data-prop="lineWidth">
                    <span class="lw-value">${lw}</span>
                </div>
            `;
        }

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
