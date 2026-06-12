/**
 * 步骤面板模块
 * 管理步骤面板的 UI 更新和事件绑定
 */

import { escapeHtml } from './utils.js';

export class StepPanel {
    constructor(stepManager, bus) {
        this.stepManager = stepManager;
        this.bus = bus;

        // DOM 元素
        this.stepList = document.getElementById('step-list');
        this.stepCounter = document.getElementById('step-counter');
        this.btnPrev = document.getElementById('btn-step-prev');
        this.btnNext = document.getElementById('btn-step-next');
        this.btnFirst = document.getElementById('btn-step-first');
        this.btnLast = document.getElementById('btn-step-last');

        // 绑定事件
        this.bindControls();
        this.bindEvents();
    }

    /**
     * 绑定步骤控制按钮
     */
    bindControls() {
        if (this.btnFirst) {
            this.btnFirst.addEventListener('click', () => {
                if (this.stepManager.steps.length === 0) return;
                this.stepManager.goToFirst();
                this.update();
            });
        }

        if (this.btnPrev) {
            this.btnPrev.addEventListener('click', () => {
                if (this.stepManager.steps.length === 0) return;
                this.stepManager.prevStep();
                this.update();
            });
        }

        if (this.btnNext) {
            this.btnNext.addEventListener('click', () => {
                if (this.stepManager.steps.length === 0) return;
                this.stepManager.nextStep();
                this.update();
            });
        }

        if (this.btnLast) {
            this.btnLast.addEventListener('click', () => {
                if (this.stepManager.steps.length === 0) return;
                this.stepManager.goToLast();
                this.update();
            });
        }
    }

    /**
     * 绑定事件监听
     */
    bindEvents() {
        this.bus.on('steps:parsed', () => this.update());

        this.bus.on('step:changed', ({ newObjects }) => {
            this.update();

            // 对新对象执行淡入动画
            if (newObjects && newObjects.length > 0) {
                this.stepManager.fadeInMultiple(newObjects);
            }
        });

        this.bus.on('step:executed', () => this.update());

        this.bus.on('store:cleared', () => this.update());
    }

    /**
     * 更新步骤面板
     */
    update() {
        if (!this.stepList) return;

        // 更新步骤列表
        this.stepList.innerHTML = '';

        if (this.stepManager.steps.length === 0) {
            this.stepList.innerHTML = '<p class="placeholder">输入包含步骤标记的命令</p>';
        } else {
            this.stepManager.steps.forEach((step, index) => {
                const div = document.createElement('div');
                div.className = 'step-item';

                if (index < this.stepManager.currentStepIndex) {
                    div.classList.add('executed');
                } else if (index === this.stepManager.currentStepIndex) {
                    div.classList.add('current');
                } else {
                    div.classList.add('pending');
                }

                const icon = index <= this.stepManager.currentStepIndex ? '✓' : '○';
                div.innerHTML = `
                    <span class="step-icon">${icon}</span>
                    <span class="step-name">${escapeHtml(step.name)}</span>
                `;

                // 添加点击事件：跳转到该步骤
                div.addEventListener('click', () => {
                    if (this.stepManager.steps.length === 0) return;
                    this.stepManager.goToStep(index);
                    this.update();
                });

                // 添加鼠标样式
                div.style.cursor = 'pointer';

                this.stepList.appendChild(div);
            });
        }

        // 更新计数器
        if (this.stepCounter) {
            if (this.stepManager.steps.length === 0) {
                this.stepCounter.textContent = '0 / 0';
            } else {
                this.stepCounter.textContent = `${this.stepManager.currentStepIndex + 1} / ${this.stepManager.getStepCount()}`;
            }
        }

        // 更新按钮状态
        const isFirst = this.stepManager.isFirstStep();
        const isLast = this.stepManager.isLastStep();
        const noSteps = this.stepManager.steps.length === 0;

        if (this.btnPrev) this.btnPrev.disabled = isFirst || noSteps;
        if (this.btnNext) this.btnNext.disabled = isLast || noSteps;
        if (this.btnFirst) this.btnFirst.disabled = isFirst || noSteps;
        if (this.btnLast) this.btnLast.disabled = isLast || noSteps;
    }
}
