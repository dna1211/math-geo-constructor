/**
 * 步骤管理器
 * 管理解题步骤的解析、执行和切换
 */

import * as THREE from 'three';
import { tokenize } from '../parser/tokenizer.js';
import { parse } from '../parser/parser.js';

export class StepManager {
    constructor(store, bus, executor) {
        this.store = store;
        this.bus = bus;
        this.executor = executor;

        this.steps = [];              // 步骤列表
        this.currentStepIndex = -1;   // 当前步骤索引（-1表示未开始）
        this.isStepMode = false;      // 是否处于步骤模式

        // 监听对象删除事件，清理步骤中的对象引用
        this.bus.on('object:deleted', ({ name }) => {
            this.steps.forEach(step => {
                step.objectNames = step.objectNames.filter(n => n !== name);
            });
        });
    }

    /**
     * 解析命令列表为步骤数组
     * @param {string[]} commands - 命令字符串数组
     * @returns {Step[]} 步骤数组
     */
    parseSteps(commands) {
        this.steps = [];
        let currentStep = {
            name: '准备',
            commands: [],
            objectNames: [],
            stepId: 0
        };

        for (const cmd of commands) {
            const trimmed = cmd.trim();
            if (!trimmed) continue;

            const stepMatch = trimmed.match(/^---step\s+(.+?)---$/);

            if (stepMatch) {
                // 保存当前步骤（如果有命令，或者是初始的"准备"步骤且有内容）
                if (currentStep.commands.length > 0) {
                    this.steps.push(currentStep);
                }
                // 创建新步骤（使用用户指定的名称）
                currentStep = {
                    name: stepMatch[1],
                    commands: [],
                    objectNames: [],
                    stepId: this.steps.length
                };
            } else {
                currentStep.commands.push(trimmed);
            }
        }

        // 保存最后一个步骤（如果有命令）
        if (currentStep.commands.length > 0) {
            this.steps.push(currentStep);
        }

        // 更新步骤ID
        this.steps.forEach((step, index) => {
            step.stepId = index;
        });

        this.isStepMode = true;
        this.currentStepIndex = -1;

        // 发出步骤解析完成事件
        this.bus.emit('steps:parsed', { steps: this.steps });

        return this.steps;
    }

    /**
     * 执行指定步骤的所有命令
     * @param {number} stepIndex - 步骤索引
     * @returns {string[]} 新创建的对象名称列表
     */
    executeStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= this.steps.length) {
            throw new Error(`步骤索引越界: ${stepIndex}`);
        }

        const step = this.steps[stepIndex];
        const createdObjects = [];

        for (const cmd of step.commands) {
            try {
                // 记录执行前的对象列表
                const beforeNames = new Set(this.store.getNames());

                // 执行命令
                const tokens = tokenize(cmd);
                const ast = parse(tokens);

                for (const node of ast) {
                    this.executor.execute(node);
                }

                // 找出新创建的对象
                const afterNames = this.store.getNames();
                for (const name of afterNames) {
                    if (!beforeNames.has(name)) {
                        const obj = this.store.get(name);
                        if (obj) {
                            obj.stepId = stepIndex;
                        }
                        createdObjects.push(name);
                        step.objectNames.push(name);
                    }
                }
            } catch (error) {
                console.error(`步骤 "${step.name}" 命令执行失败: ${cmd}`, error);
                throw error;
            }
        }

        // 发出步骤执行完成事件
        this.bus.emit('step:executed', { stepIndex, step, createdObjects });

        return createdObjects;
    }

    /**
     * 执行到指定步骤
     * @param {number} targetIndex - 目标步骤索引
     */
    executeToStep(targetIndex) {
        if (targetIndex < 0 || targetIndex >= this.steps.length) {
            return;
        }

        const previousIndex = this.currentStepIndex;

        // 如果是后退，需要清空后重新执行
        if (targetIndex < previousIndex) {
            this.clearAndReexecuteTo(targetIndex);
        } else {
            // 前进：逐步执行
            for (let i = previousIndex + 1; i <= targetIndex; i++) {
                const newObjects = this.executeStep(i);

                // 更新可见性
                this.updateVisibility(i);

                // 发出步骤切换事件（带新对象信息）
                if (i === targetIndex) {
                    const newObjectRefs = newObjects
                        .map(name => this.store.get(name))
                        .filter(obj => obj && obj.renderRef);

                    this.bus.emit('step:changed', {
                        from: previousIndex,
                        to: i,
                        step: this.steps[i],
                        newObjects: newObjectRefs
                    });
                }
            }
        }

        this.currentStepIndex = targetIndex;
    }

    /**
     * 清空并重新执行到指定步骤
     * @param {number} targetIndex - 目标步骤索引
     */
    clearAndReexecuteTo(targetIndex) {
        // 清空所有对象
        this.store.clear();

        // 重新执行到目标步骤
        for (let i = 0; i <= targetIndex; i++) {
            this.executeStep(i);
        }

        // 更新可见性
        this.updateVisibility(targetIndex);

        // 发出步骤切换事件
        this.bus.emit('step:changed', {
            from: this.currentStepIndex,
            to: targetIndex,
            step: this.steps[targetIndex],
            newObjects: []
        });
    }

    /**
     * 前进到下一步
     */
    nextStep() {
        if (this.isLastStep()) return;
        this.executeToStep(this.currentStepIndex + 1);
    }

    /**
     * 后退到上一步
     */
    prevStep() {
        if (this.isFirstStep()) return;
        this.executeToStep(this.currentStepIndex - 1);
    }

    /**
     * 跳转到指定步骤
     * @param {number} stepIndex - 目标步骤索引
     */
    goToStep(stepIndex) {
        if (this.steps.length === 0) return;
        if (stepIndex < 0 || stepIndex >= this.steps.length) return;
        this.executeToStep(stepIndex);
    }

    /**
     * 跳转到第一步
     */
    goToFirst() {
        if (this.steps.length === 0) return;
        this.clearAndReexecuteTo(0);
        this.currentStepIndex = 0;
    }

    /**
     * 跳转到最后一步
     */
    goToLast() {
        if (this.steps.length === 0) return;
        this.executeToStep(this.steps.length - 1);
    }

    /**
     * 更新对象可见性
     * @param {number} currentStep - 当前步骤索引
     */
    updateVisibility(currentStep) {
        this.store.getAll().forEach(obj => {
            if (obj.renderRef) {
                if (obj.stepId <= currentStep) {
                    obj.renderRef.visible = true;
                } else {
                    obj.renderRef.visible = false;
                }
            }
        });
    }

    /**
     * 淡入动画
     * @param {THREE.Object3D} object - Three.js对象
     * @param {number} duration - 动画时长（毫秒）
     */
    fadeIn(object, duration = 500) {
        if (!object) return;

        // 处理 Group 对象（如三角形、多边形）
        if (object.isGroup) {
            object.children.forEach(child => this.fadeIn(child, duration));
            return;
        }

        if (!object.material) return;

        // 设置透明属性
        object.material.transparent = true;
        object.material.opacity = 0;
        object.visible = true;

        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            object.material.opacity = progress;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // 动画完成，恢复非透明（如果不原本就是透明的）
                const originalOpacity = object.material.userData?.originalOpacity;
                if (originalOpacity === undefined || originalOpacity >= 1) {
                    object.material.transparent = false;
                    object.material.opacity = 1;
                }
            }
        };

        animate();
    }

    /**
     * 批量淡入多个对象
     * @param {Array} objects - 对象数组
     * @param {number} stagger - 每个对象的延迟（毫秒）
     */
    fadeInMultiple(objects, stagger = 50) {
        objects.forEach((obj, index) => {
            if (obj.renderRef) {
                setTimeout(() => {
                    this.fadeIn(obj.renderRef);
                }, index * stagger);
            }
        });
    }

    /**
     * 判断是否是第一步
     * @returns {boolean}
     */
    isFirstStep() {
        return this.currentStepIndex <= 0;
    }

    /**
     * 判断是否是最后一步
     * @returns {boolean}
     */
    isLastStep() {
        return this.currentStepIndex >= this.steps.length - 1;
    }

    /**
     * 获取步骤总数
     * @returns {number}
     */
    getStepCount() {
        return this.steps.length;
    }

    /**
     * 获取当前步骤
     * @returns {Step|null}
     */
    getCurrentStep() {
        if (this.currentStepIndex >= 0 && this.currentStepIndex < this.steps.length) {
            return this.steps[this.currentStepIndex];
        }
        return null;
    }

    /**
     * 重置步骤管理器
     */
    reset() {
        this.steps = [];
        this.currentStepIndex = -1;
        this.isStepMode = false;
    }
}
