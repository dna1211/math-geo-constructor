/**
 * 语法解析器
 * 递归下降解析器，将 Token 数组解析为 AST
 */

import { TokenType } from './tokenizer.js';

/**
 * 解析器类
 */
export class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
    }

    /** 获取当前 Token */
    current() {
        return this.tokens[this.pos];
    }

    /** 前进到下一个 Token */
    advance() {
        this.pos++;
        return this.tokens[this.pos - 1];
    }

    /** 匹配并消费指定类型的 Token */
    expect(type) {
        const token = this.current();
        if (token.type !== type) {
            throw new Error(`期望 ${type}，但得到 ${token.type} (位置 ${token.position})`);
        }
        return this.advance();
    }

    /** 检查当前 Token 是否匹配 */
    check(type) {
        return this.current().type === type;
    }

    /** 解析入口 */
    parse() {
        const statements = [];

        while (!this.check(TokenType.EOF)) {
            statements.push(this.parseStatement());
        }

        return statements;
    }

    /** 解析单条语句 */
    parseStatement() {
        const token = this.current();

        // 无参命令：Undo, Redo, Clear, Grid, Axis
        if (token.type === TokenType.IDENT && this.isCommand(token.value)) {
            this.advance();
            return { type: 'command', name: token.value };
        }

        // 赋值语句：A = expr
        if (token.type === TokenType.IDENT && this.tokens[this.pos + 1]?.type === TokenType.EQUALS) {
            const name = this.advance().value;
            this.advance(); // 消费 =
            const value = this.parseExpression();
            return { type: 'assign', name, value };
        }

        // 函数调用：Func(args...)
        return this.parseCall();
    }

    /** 解析表达式 */
    parseExpression() {
        return this.parseAddSub();
    }

    /** 解析加减 */
    parseAddSub() {
        let left = this.parseMulDiv();

        while (this.check(TokenType.PLUS) || this.check(TokenType.MINUS)) {
            const op = this.advance().value;
            const right = this.parseMulDiv();
            left = { type: 'binary', op, left, right };
        }

        return left;
    }

    /** 解析乘除 */
    parseMulDiv() {
        let left = this.parseUnary();

        while (this.check(TokenType.STAR) || this.check(TokenType.SLASH)) {
            const op = this.advance().value;
            const right = this.parseUnary();
            left = { type: 'binary', op, left, right };
        }

        return left;
    }

    /** 解析一元运算 */
    parseUnary() {
        if (this.check(TokenType.MINUS)) {
            this.advance();
            const operand = this.parseUnary();
            return { type: 'unary', op: '-', operand };
        }
        return this.parsePrimary();
    }

    /** 解析原子表达式 */
    parsePrimary() {
        const token = this.current();

        // 数字
        if (token.type === TokenType.NUMBER) {
            this.advance();
            return { type: 'number', value: token.value };
        }

        // 标识符或函数调用
        if (token.type === TokenType.IDENT) {
            // 检查是否是函数调用
            if (this.tokens[this.pos + 1]?.type === TokenType.LPAREN) {
                return this.parseCall();
            }

            this.advance();
            return { type: 'ident', name: token.value };
        }

        // 括号表达式或元组
        if (token.type === TokenType.LPAREN) {
            return this.parseParenOrTuple();
        }

        throw new Error(`意外的 Token: ${token.type} (位置 ${token.position})`);
    }

    /** 解析括号表达式或元组 */
    parseParenOrTuple() {
        this.expect(TokenType.LPAREN);

        // 空括号
        if (this.check(TokenType.RPAREN)) {
            this.advance();
            return { type: 'tuple', elements: [] };
        }

        const elements = [this.parseExpression()];

        // 多个元素 = 元组
        while (this.check(TokenType.COMMA)) {
            this.advance();
            elements.push(this.parseExpression());
        }

        this.expect(TokenType.RPAREN);

        // 单个元素 = 括号表达式
        if (elements.length === 1) {
            return elements[0];
        }

        return { type: 'tuple', elements };
    }

    /** 解析函数调用 */
    parseCall() {
        const name = this.expect(TokenType.IDENT).value;
        this.expect(TokenType.LPAREN);

        const args = [];
        if (!this.check(TokenType.RPAREN)) {
            args.push(this.parseExpression());
            while (this.check(TokenType.COMMA)) {
                this.advance();
                args.push(this.parseExpression());
            }
        }

        this.expect(TokenType.RPAREN);

        return { type: 'call', func: name, args };
    }

    /** 判断是否是无参命令 */
    isCommand(name) {
        const commands = ['Undo', 'Redo', 'Clear', 'Grid', 'Axis'];
        return commands.includes(name);
    }
}

/**
 * 解析入口函数
 * @param {Array} tokens - Token 数组
 * @returns {Array} AST 节点数组
 */
export function parse(tokens) {
    const parser = new Parser(tokens);
    return parser.parse();
}
