/**
 * 词法分析器
 * 将输入字符串转换为 Token 数组
 */

// Token 类型
export const TokenType = {
    IDENT: 'IDENT',         // 标识符：A, B, α, β, P'
    NUMBER: 'NUMBER',       // 数字：123, -1.5, 0.5
    LPAREN: 'LPAREN',       // (
    RPAREN: 'RPAREN',       // )
    COMMA: 'COMMA',         // ,
    EQUALS: 'EQUALS',       // =
    PLUS: 'PLUS',           // +
    MINUS: 'MINUS',         // -
    STAR: 'STAR',           // *
    SLASH: 'SLASH',         // /
    EOF: 'EOF'              // 结束
};

// Token 正则表达式
// 注意：负数只有在运算符或左括号后面时才作为整体匹配
const TOKEN_RE = /\s*([A-Za-zͰ-Ͽ_][A-Za-z0-9Ͱ-Ͽ_']*|\d+\.?\d*|[=(),+\/*-])/g;

/**
 * 词法分析
 * @param {string} input - 输入字符串
 * @returns {Array<Object>} Token 数组
 * @throws {Error} 词法错误
 */
export function tokenize(input) {
    const tokens = [];
    let lastIndex = 0;

    // 重置正则
    TOKEN_RE.lastIndex = 0;

    let match;
    while ((match = TOKEN_RE.exec(input)) !== null) {
        // 检查是否有未匹配的字符
        if (match.index > lastIndex) {
            const skipped = input.slice(lastIndex, match.index).trim();
            if (skipped) {
                throw new Error(`意外的字符: "${skipped}" (位置 ${lastIndex})`);
            }
        }

        const value = match[1];
        lastIndex = TOKEN_RE.lastIndex;

        // 确定 Token 类型
        let type;
        if (value === '(') {
            type = TokenType.LPAREN;
        } else if (value === ')') {
            type = TokenType.RPAREN;
        } else if (value === ',') {
            type = TokenType.COMMA;
        } else if (value === '=') {
            type = TokenType.EQUALS;
        } else if (value === '+') {
            type = TokenType.PLUS;
        } else if (value === '-') {
            type = TokenType.MINUS;
        } else if (value === '*') {
            type = TokenType.STAR;
        } else if (value === '/') {
            type = TokenType.SLASH;
        } else if (/^\d+\.?\d*$/.test(value)) {
            type = TokenType.NUMBER;
        } else {
            type = TokenType.IDENT;
        }

        tokens.push({
            type,
            value: type === TokenType.NUMBER ? parseFloat(value) : value,
            position: match.index
        });
    }

    // 检查尾部是否有未匹配的字符
    if (lastIndex < input.length) {
        const remaining = input.slice(lastIndex).trim();
        if (remaining) {
            throw new Error(`意外的字符: "${remaining}" (位置 ${lastIndex})`);
        }
    }

    // 添加 EOF
    tokens.push({
        type: TokenType.EOF,
        value: null,
        position: input.length
    });

    return tokens;
}
