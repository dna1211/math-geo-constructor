/**
 * 命令执行器
 * 执行 AST 节点，调用几何操作函数
 */

import * as calc from '../geometry/calc.js';
import * as construct from '../geometry/construct.js';

export class Executor {
    constructor(store, bus, history) {
        this.store = store;
        this.bus = bus;
        this.history = history;

        // 命令注册表
        this.commands = new Map();
        this.registerBuiltinCommands();

        // 全局计数器（避免删除后名称冲突）
        this._autoCounter = 0;
    }

    /**
     * 注册内置命令
     */
    registerBuiltinCommands() {
        // 构造类
        this.registerCommand('Point', { minArgs: 1, maxArgs: 3, handler: this.cmdPoint.bind(this) });
        this.registerCommand('Segment', { minArgs: 2, maxArgs: 2, handler: this.cmdSegment.bind(this) });
        this.registerCommand('Line', { minArgs: 2, maxArgs: 2, handler: this.cmdLine.bind(this) });
        this.registerCommand('Ray', { minArgs: 2, maxArgs: 2, handler: this.cmdRay.bind(this) });
        this.registerCommand('Triangle', { minArgs: 3, maxArgs: 3, handler: this.cmdTriangle.bind(this) });
        this.registerCommand('Polygon', { minArgs: 3, maxArgs: Infinity, handler: this.cmdPolygon.bind(this) });
        this.registerCommand('Plane', { minArgs: 3, maxArgs: 4, handler: this.cmdPlane.bind(this) });

        // 计算类
        this.registerCommand('Midpoint', { minArgs: 2, maxArgs: 2, handler: this.cmdMidpoint.bind(this) });
        this.registerCommand('Fold', { minArgs: 3, maxArgs: 3, handler: this.cmdFold.bind(this) });
        this.registerCommand('Reflect', { minArgs: 2, maxArgs: 2, handler: this.cmdReflect.bind(this) });
        this.registerCommand('Distance', { minArgs: 2, maxArgs: 2, handler: this.cmdDistance.bind(this) });

        // 构造类（高级）
        this.registerCommand('RegularPolygon', { minArgs: 4, maxArgs: 4, handler: this.cmdRegularPolygon.bind(this) });
        this.registerCommand('EquilateralTriangle', { minArgs: 3, maxArgs: 3, handler: this.cmdEquilateralTriangle.bind(this) });

        // 样式类
        this.registerCommand('Color', { minArgs: 2, maxArgs: 2, handler: this.cmdColor.bind(this) });
        this.registerCommand('Dash', { minArgs: 1, maxArgs: 2, handler: this.cmdDash.bind(this) });
        this.registerCommand('Opacity', { minArgs: 2, maxArgs: 2, handler: this.cmdOpacity.bind(this) });
        this.registerCommand('Hide', { minArgs: 1, maxArgs: 1, handler: this.cmdHide.bind(this) });
        this.registerCommand('Show', { minArgs: 1, maxArgs: 1, handler: this.cmdShow.bind(this) });
        this.registerCommand('Label', { minArgs: 2, maxArgs: 2, handler: this.cmdLabel.bind(this) });

        // 操作类
        this.registerCommand('Delete', { minArgs: 1, maxArgs: 1, handler: this.cmdDelete.bind(this) });
        this.registerCommand('Undo', { minArgs: 0, maxArgs: 0, handler: this.cmdUndo.bind(this) });
        this.registerCommand('Redo', { minArgs: 0, maxArgs: 0, handler: this.cmdRedo.bind(this) });
        this.registerCommand('Clear', { minArgs: 0, maxArgs: 0, handler: this.cmdClear.bind(this) });
        this.registerCommand('Grid', { minArgs: 0, maxArgs: 1, handler: this.cmdGrid.bind(this) });
        this.registerCommand('Axis', { minArgs: 0, maxArgs: 1, handler: this.cmdAxis.bind(this) });
    }

    /**
     * 注册命令
     * @param {string} name - 命令名称
     * @param {Object} definition - 命令定义
     */
    registerCommand(name, definition) {
        this.commands.set(name, definition);
    }

    /**
     * 执行 AST 节点
     * @param {Object} ast - AST 节点
     * @returns {*} 执行结果
     * @throws {Error} 执行错误
     */
    execute(ast) {
        switch (ast.type) {
            case 'assign':
                return this.executeAssign(ast);
            case 'call':
                return this.executeCallAndRegister(ast);
            case 'command':
                return this.executeCommand(ast);
            default:
                throw new Error(`未知的 AST 节点类型: ${ast.type}`);
        }
    }

    /**
     * 执行函数调用并注册结果
     */
    executeCallAndRegister(ast) {
        const result = this.executeCall(ast);

        // 如果返回的是几何对象，自动注册到 store
        if (result && result.type && result.data) {
            // 生成自动名称
            const autoName = this.generateAutoName(result.type);
            return this.store.register(autoName, result);
        }

        return result;
    }

    /**
     * 生成自动名称
     */
    generateAutoName(type) {
        const prefix = type === 'segment' ? 'seg' :
                       type === 'line' ? 'line' :
                       type === 'ray' ? 'ray' :
                       type === 'triangle' ? 'tri' :
                       type === 'polygon' ? 'poly' :
                       type === 'plane' ? 'plane' : 'obj';

        let counter = 1;
        let name = `${prefix}${counter}`;
        while (this.store.has(name)) {
            counter++;
            name = `${prefix}${counter}`;
        }
        return name;
    }

    /**
     * 执行赋值语句
     */
    executeAssign(ast) {
        const value = this.evaluate(ast.value);

        // 如果值是几何对象，注册到 store
        if (value && value.type && value.data) {
            if (this.store.has(ast.name)) {
                // 更新现有对象
                this.store.update(ast.name, { data: value.data });
                return this.store.get(ast.name);
            } else {
                // 注册新对象
                return this.store.register(ast.name, value);
            }
        }

        // 如果是数字，存储为标量变量（点对象而非数值点）
        if (typeof value === 'number') {
            // 用一个特殊的点对象表示标量，放在 X 轴上
            // 并在 style.label 中记录实际数值
            return this.store.register(ast.name, {
                type: 'point',
                data: { x: value, y: 0, z: 0 },
                style: { label: `= ${value}` }
            });
        }

        if (Array.isArray(value)) {
            const [x = 0, y = 0, z = 0] = value;
            return this.store.register(ast.name, {
                type: 'point',
                data: { x, y, z }
            });
        }

        return value;
    }

    /**
     * 执行函数调用
     */
    executeCall(ast) {
        const cmd = this.commands.get(ast.func);
        if (!cmd) {
            throw new Error(`未知命令: ${ast.func}`);
        }

        if (ast.args.length < cmd.minArgs || ast.args.length > cmd.maxArgs) {
            throw new Error(`${ast.func} 参数数量错误，期望 ${cmd.minArgs}-${cmd.maxArgs} 个`);
        }

        // 求值参数
        const args = ast.args.map(arg => this.evaluate(arg));
        return cmd.handler(args);
    }

    /**
     * 执行无参命令
     */
    executeCommand(ast) {
        const cmd = this.commands.get(ast.name);
        if (!cmd) {
            throw new Error(`未知命令: ${ast.name}`);
        }
        return cmd.handler([]);
    }

    /**
     * 求值表达式
     */
    evaluate(node) {
        if (!node) return null;

        switch (node.type) {
            case 'number':
                return node.value;

            case 'ident':
                if (this.store.has(node.name)) {
                    return this.store.get(node.name);
                }
                throw new Error(`未定义的对象: ${node.name}`);

            case 'tuple':
                return node.elements.map(el => this.evaluate(el));

            case 'binary':
                return this.evaluateBinary(node);

            case 'unary': {
                const val = this.evaluate(node.operand);
                if (typeof val !== 'number') {
                    throw new Error('一元负号只能用于数值');
                }
                return -val;
            }

            case 'call':
                return this.executeCall(node);

            default:
                throw new Error(`无法求值的节点类型: ${node.type}`);
        }
    }

    /**
     * 求值二元运算
     */
    evaluateBinary(node) {
        const left = this.evaluate(node.left);
        const right = this.evaluate(node.right);

        // 数字运算
        if (typeof left === 'number' && typeof right === 'number') {
            switch (node.op) {
                case '+': return left + right;
                case '-': return left - right;
                case '*': return left * right;
                case '/':
                    if (right === 0) throw new Error('除数不能为零');
                    return left / right;
            }
        }

        // 向量运算
        if (Array.isArray(left) && Array.isArray(right)) {
            const result = [];
            const len = Math.max(left.length, right.length);
            for (let i = 0; i < len; i++) {
                const a = left[i] || 0;
                const b = right[i] || 0;
                switch (node.op) {
                    case '+': result.push(a + b); break;
                    case '-': result.push(a - b); break;
                    default: throw new Error(`不支持的向量运算: ${node.op}`);
                }
            }
            return result;
        }

        // 点 + 向量
        if (left?.type === 'point' && Array.isArray(right)) {
            const [dx = 0, dy = 0, dz = 0] = right;
            return {
                type: 'point',
                data: {
                    x: left.data.x + dx,
                    y: left.data.y + dy,
                    z: left.data.z + dz
                }
            };
        }

        throw new Error(`不支持的运算: ${typeof left} ${node.op} ${typeof right}`);
    }

    // ===== 内置命令实现 =====

    /** Point(x, y, z) 或 Point([x, y, z]) 或 Point(x) */
    cmdPoint(args) {
        // 支持 Point([x, y, z]) 语法
        if (args.length === 1 && Array.isArray(args[0])) {
            const [x = 0, y = 0, z = 0] = args[0];
            return { type: 'point', data: { x, y, z } };
        }
        // 支持 Point(x) 语法
        if (args.length === 1 && typeof args[0] === 'number') {
            return { type: 'point', data: { x: args[0], y: 0, z: 0 } };
        }
        // 支持 Point(x, y, z) 语法
        if (args.length === 3 && args.every(a => typeof a === 'number')) {
            const [x = 0, y = 0, z = 0] = args;
            return { type: 'point', data: { x, y, z } };
        }
        // 支持 Point(pointObj) 语法
        if (args.length === 1 && args[0]?.type === 'point') {
            return args[0];
        }
        throw new Error('Point 参数错误');
    }

    /** Segment(A, B) */
    cmdSegment(args) {
        const [from, to] = args;
        if (!from?.name || !to?.name) {
            throw new Error('Segment 需要两个点对象');
        }
        return {
            type: 'segment',
            data: { from: from.name, to: to.name },
            parents: [from.name, to.name]
        };
    }

    /** Triangle(A, B, C) */
    cmdTriangle(args) {
        const names = args.map(a => {
            if (!a?.name) throw new Error('Triangle 需要三个点对象');
            return a.name;
        });
        return {
            type: 'triangle',
            data: { points: names },
            parents: names
        };
    }

    /** Polygon(A, B, C, ...) */
    cmdPolygon(args) {
        const names = args.map(a => {
            if (!a?.name) throw new Error('Polygon 需要点对象');
            return a.name;
        });
        if (names.length < 3) {
            throw new Error('Polygon 至少需要 3 个点');
        }
        return {
            type: 'polygon',
            data: { points: names },
            parents: names
        };
    }

    /** Line(A, B) - 无限直线 */
    cmdLine(args) {
        const [from, to] = args;
        if (!from?.name || !to?.name) {
            throw new Error('Line 需要两个点对象');
        }
        return {
            type: 'line',
            data: { from: from.name, to: to.name },
            parents: [from.name, to.name]
        };
    }

    /** Ray(A, B) - 射线 */
    cmdRay(args) {
        const [origin, through] = args;
        if (!origin?.name || !through?.name) {
            throw new Error('Ray 需要两个点对象');
        }
        return {
            type: 'ray',
            data: { origin: origin.name, through: through.name },
            parents: [origin.name, through.name]
        };
    }

    /** Plane(A, B, C) 或 Plane(a, b, c, d) */
    cmdPlane(args) {
        if (args.length === 3) {
            // 三点确定平面
            const names = args.map(a => {
                if (!a?.name) throw new Error('Plane 需要三个点对象');
                return a.name;
            });
            return {
                type: 'plane',
                data: { points: names },
                parents: names
            };
        } else if (args.length === 4) {
            // 平面方程 ax + by + cz + d = 0
            const [a, b, c, d] = args.map(v => {
                if (typeof v !== 'number') throw new Error('Plane 方程参数必须是数字');
                return v;
            });
            return {
                type: 'plane',
                data: { a, b, c, d },
                parents: []
            };
        }
        throw new Error('Plane 需要 3 个点或 4 个数字（方程参数）');
    }

    /**
     * RegularPolygon(Segment(A,B), sides, Plane(X,Y,Z), angle)
     * 在线段上构造正多边形，与指定平面成指定角度
     */
    cmdRegularPolygon(args) {
        const [seg, sides, plane, angle] = args;

        // 验证参数
        if (!seg?.data) throw new Error('RegularPolygon 第一个参数需要是线段');
        if (typeof sides !== 'number' || sides < 3) throw new Error('RegularPolygon 第二个参数需要是 ≥3 的数字');
        if (!plane?.data) throw new Error('RegularPolygon 第三个参数需要是平面');
        if (typeof angle !== 'number') throw new Error('RegularPolygon 第四个参数需要是角度');

        // 获取线段端点
        const from = this.store.get(seg.data.from);
        const to = this.store.get(seg.data.to);
        if (!from || !to) throw new Error('线段端点不存在');

        // 获取平面信息
        let planeData;
        if (plane.data.points) {
            const points = plane.data.points.map(name => {
                const p = this.store.get(name);
                if (!p) throw new Error(`平面点 ${name} 不存在`);
                return p.data;
            });
            planeData = { points };
        } else {
            planeData = { normal: { x: plane.data.a, y: plane.data.b, z: plane.data.c } };
        }

        // 构造正多边形
        const vertices = construct.constructRegularPolygon(
            { from: from.data, to: to.data },
            sides,
            planeData,
            angle
        );

        // 创建点对象
        const pointNames = [];
        const prefix = `v${sides}`;
        for (let i = 0; i < vertices.length; i++) {
            this._autoCounter++;
            const name = `${prefix}_${this._autoCounter}`;
            this.store.register(name, {
                type: 'point',
                data: vertices[i],
                parents: [seg.name, plane.name]
            });
            pointNames.push(name);
        }

        // 创建多边形
        return {
            type: 'polygon',
            data: { points: pointNames },
            parents: pointNames
        };
    }

    /**
     * EquilateralTriangle(Segment(A,B), Plane(X,Y,Z), angle)
     * 在线段上构造正三角形，与指定平面成指定角度
     */
    cmdEquilateralTriangle(args) {
        const [seg, plane, angle] = args;

        // 验证参数
        if (!seg?.data) throw new Error('EquilateralTriangle 第一个参数需要是线段');
        if (!plane?.data) throw new Error('EquilateralTriangle 第二个参数需要是平面');
        if (typeof angle !== 'number') throw new Error('EquilateralTriangle 第三个参数需要是角度');

        // 获取线段端点
        const from = this.store.get(seg.data.from);
        const to = this.store.get(seg.data.to);
        if (!from || !to) throw new Error('线段端点不存在');

        // 获取平面信息
        let planeData;
        if (plane.data.points) {
            const points = plane.data.points.map(name => {
                const p = this.store.get(name);
                if (!p) throw new Error(`平面点 ${name} 不存在`);
                return p.data;
            });
            planeData = { points };
        } else {
            planeData = { normal: { x: plane.data.a, y: plane.data.b, z: plane.data.c } };
        }

        // 构造正三角形
        const vertices = construct.constructEquilateralTriangle(
            { from: from.data, to: to.data },
            planeData,
            angle
        );

        // 创建点对象
        const pointNames = [];
        for (let i = 0; i < vertices.length; i++) {
            this._autoCounter++;
            const name = `v3_${this._autoCounter}`;
            this.store.register(name, {
                type: 'point',
                data: vertices[i],
                parents: [seg.name, plane.name]
            });
            pointNames.push(name);
        }

        // 创建三角形
        return {
            type: 'triangle',
            data: { points: pointNames },
            parents: pointNames
        };
    }

    /** Midpoint(A, B) */
    cmdMidpoint(args) {
        const [p1, p2] = args;
        if (!p1?.data || !p2?.data) {
            throw new Error('Midpoint 需要两个点对象');
        }
        const mid = calc.midpoint(p1.data, p2.data);
        const result = {
            type: 'point',
            data: mid,
            parents: [p1.name, p2.name]
        };
        // 存储重算函数
        result.compute = (store) => {
            const a = store.get(p1.name);
            const b = store.get(p2.name);
            if (a && b) return calc.midpoint(a.data, b.data);
            return null;
        };
        return result;
    }

    /** Fold(P, Line(A,B), angle) */
    cmdFold(args) {
        const [point, axis, angle] = args;
        if (!point?.data) throw new Error('Fold 第一个参数需要是点');
        if (!axis?.data) throw new Error('Fold 第二个参数需要是线');
        if (typeof angle !== 'number') throw new Error('Fold 第三个参数需要是角度');

        let axisData;
        if (axis.type === 'line' || axis.type === 'segment') {
            const from = this.store.get(axis.data.from);
            const to = this.store.get(axis.data.to);
            if (!from || !to) throw new Error('轴线端点不存在');
            axisData = { from: from.data, to: to.data };
        } else {
            throw new Error('Fold 第二个参数需要是线段或直线');
        }

        const result = calc.fold(point.data, axisData, angle);
        const axisName = axis.name;
        const pointName = point.name;
        return {
            type: 'point',
            data: result,
            parents: [pointName, axisName],
            compute: (store) => {
                const p = store.get(pointName);
                const ax = store.get(axisName);
                if (!p || !ax) return null;
                const f = store.get(ax.data.from);
                const t = store.get(ax.data.to);
                if (!f || !t) return null;
                return calc.fold(p.data, { from: f.data, to: t.data }, angle);
            }
        };
    }

    /** Reflect(P, Line(A,B)) 或 Reflect(P, Plane(...)) */
    cmdReflect(args) {
        const [point, target] = args;
        if (!point?.data) throw new Error('Reflect 第一个参数需要是点');
        const pointName = point.name;
        const targetName = target.name;

        if (target.type === 'line' || target.type === 'segment') {
            // 关于线对称
            const from = this.store.get(target.data.from);
            const to = this.store.get(target.data.to);
            if (!from || !to) throw new Error('对称轴端点不存在');
            const axisData = { from: from.data, to: to.data };
            const result = calc.reflectLine(point.data, axisData);
            return {
                type: 'point',
                data: result,
                parents: [pointName, targetName],
                compute: (store) => {
                    const p = store.get(pointName);
                    const t = store.get(targetName);
                    if (!p || !t) return null;
                    const f = store.get(t.data.from);
                    const tt = store.get(t.data.to);
                    if (!f || !tt) return null;
                    return calc.reflectLine(p.data, { from: f.data, to: tt.data });
                }
            };
        } else if (target.type === 'plane') {
            // 关于平面对称
            let planeData;
            if (target.data.points) {
                const points = target.data.points.map(name => {
                    const p = this.store.get(name);
                    if (!p) throw new Error(`平面点 ${name} 不存在`);
                    return p.data;
                });
                planeData = { points };
            } else {
                planeData = target.data;
            }
            const result = calc.reflectPlane(point.data, planeData);
            return {
                type: 'point',
                data: result,
                parents: [pointName, targetName],
                compute: (store) => {
                    const p = store.get(pointName);
                    const t = store.get(targetName);
                    if (!p || !t) return null;
                    let pd;
                    if (t.data.points) {
                        const pts = t.data.points.map(n => {
                            const pt = store.get(n);
                            return pt ? pt.data : null;
                        });
                        if (pts.some(pp => !pp)) return null;
                        pd = { points: pts };
                    } else {
                        pd = t.data;
                    }
                    return calc.reflectPlane(p.data, pd);
                }
            };
        }

        throw new Error('Reflect 第二个参数需要是线或平面');
    }

    /** Distance(A, B) */
    cmdDistance(args) {
        const [p1, p2] = args;
        if (!p1?.data || !p2?.data) {
            throw new Error('Distance 需要两个点对象');
        }
        const d = calc.distance(p1.data, p2.data);
        return d;  // 返回数字
    }

    /** Color(obj, color) */
    cmdColor(args) {
        const [obj, color] = args;
        if (!obj?.name) throw new Error('Color 第一个参数需要是对象');
        this.store.update(obj.name, { style: { color } });
        return { type: 'command', name: 'Color' };
    }

    /** Dash(obj, true/false) */
    cmdDash(args) {
        const [obj, enabled = true] = args;
        if (!obj?.name) throw new Error('Dash 第一个参数需要是对象');
        this.store.update(obj.name, { style: { dash: enabled } });
        return { type: 'command', name: 'Dash' };
    }

    /** Opacity(obj, value) */
    cmdOpacity(args) {
        const [obj, opacity] = args;
        if (!obj?.name) throw new Error('Opacity 第一个参数需要是对象');
        if (typeof opacity !== 'number') throw new Error('Opacity 第二个参数需要是数字');
        this.store.update(obj.name, { style: { opacity } });
        return { type: 'command', name: 'Opacity' };
    }

    /** Hide(obj) */
    cmdHide(args) {
        const [obj] = args;
        if (!obj?.name) throw new Error('Hide 需要一个对象');
        this.store.update(obj.name, { style: { visible: false } });
        return { type: 'command', name: 'Hide' };
    }

    /** Show(obj) */
    cmdShow(args) {
        const [obj] = args;
        if (!obj?.name) throw new Error('Show 需要一个对象');
        this.store.update(obj.name, { style: { visible: true } });
        return { type: 'command', name: 'Show' };
    }

    /** Label(obj, text) */
    cmdLabel(args) {
        const [obj, text] = args;
        if (!obj?.name) throw new Error('Label 第一个参数需要是对象');
        this.store.update(obj.name, { style: { label: text } });
        return { type: 'command', name: 'Label' };
    }

    /** Delete(obj) */
    cmdDelete(args) {
        const [obj] = args;
        if (!obj?.name) throw new Error('Delete 需要一个对象');
        this.store.unregister(obj.name);
        return { type: 'command', name: 'Delete' };
    }

    /** Undo */
    cmdUndo() {
        if (this.history) {
            this.history.undo();
        }
        this.bus.emit('command:undo');
        return { type: 'command', name: 'Undo' };
    }

    /** Redo */
    cmdRedo() {
        if (this.history) {
            this.history.redo();
        }
        this.bus.emit('command:redo');
        return { type: 'command', name: 'Redo' };
    }

    /** Clear */
    cmdClear() {
        this.store.clear();
        return { type: 'command', name: 'Clear' };
    }

    /** Grid */
    cmdGrid(args) {
        this.bus.emit('command:grid', { visible: args[0] });
        return { type: 'command', name: 'Grid' };
    }

    /** Axis */
    cmdAxis(args) {
        this.bus.emit('command:axis', { visible: args[0] });
        return { type: 'command', name: 'Axis' };
    }
}
