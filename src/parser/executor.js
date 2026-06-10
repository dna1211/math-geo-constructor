/**
 * 命令执行器
 * 执行 AST 节点，调用几何操作函数
 */

export class Executor {
    constructor(store, bus) {
        this.store = store;
        this.bus = bus;

        // 命令注册表
        this.commands = new Map();
        this.registerBuiltinCommands();
    }

    /**
     * 注册内置命令
     */
    registerBuiltinCommands() {
        // 构造类
        this.registerCommand('Point', { minArgs: 1, maxArgs: 1, handler: this.cmdPoint.bind(this) });
        this.registerCommand('Segment', { minArgs: 2, maxArgs: 2, handler: this.cmdSegment.bind(this) });
        this.registerCommand('Triangle', { minArgs: 3, maxArgs: 3, handler: this.cmdTriangle.bind(this) });
        this.registerCommand('Polygon', { minArgs: 3, maxArgs: Infinity, handler: this.cmdPolygon.bind(this) });

        // 操作类
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

        // 如果是数字或元组，创建点
        if (typeof value === 'number') {
            return this.store.register(ast.name, {
                type: 'point',
                data: { x: value, y: 0, z: 0 }
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

            case 'unary':
                return -this.evaluate(node.operand);

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
                case '/': return left / right;
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

    /** Point(x, y, z) 或 Point([x, y, z]) */
    cmdPoint(args) {
        const arg = args[0];
        if (Array.isArray(arg)) {
            const [x = 0, y = 0, z = 0] = arg;
            return { type: 'point', data: { x, y, z } };
        }
        if (typeof arg === 'number') {
            return { type: 'point', data: { x: arg, y: 0, z: 0 } };
        }
        if (arg?.type === 'point') {
            return arg;
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

    /** Undo */
    cmdUndo() {
        this.bus.emit('command:undo');
        return { type: 'command', name: 'Undo' };
    }

    /** Redo */
    cmdRedo() {
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
