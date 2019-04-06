function compiler(input) {
    var tokens = tokenizer(input);
    var ast = parser(tokens);
    var newAst = transformer(ast);
    var output = codeGenerator(newAst);

    return output;
}

function tokenizer(input) {
    let tokens = [];
    let current = 0;

    let WHITESPACE = /\s/;
    let NUMBERS = /[0-9]/;
    let LETTERS = /[a-z]/;

    while (current < input.length) {
        var char = input[current];
        if (char === '(' || char === ')') {
            tokens.push({
                type: 'paren',
                value: char
            });
            current++;
            continue;
        }

        if (WHITESPACE.test(char)) {
            current++;
            continue;
        }

        if (NUMBERS.test(char)) {
            let value = '';
            while (NUMBERS.test(char)) {
                value += char;
                char = input[++current];
            }
            tokens.push({
                type: 'number',
                value: value
            });
            continue;
        }

        if (LETTERS.test(char)) {
            let value = '';
            while (LETTERS.test(char)) {
                value += char;
                char = input[++current];
            }
            tokens.push({
                type: 'name',
                value: value
            });
            continue;
        }

        throw new TypeError('Unknown type');
    }

    return tokens;
}

function parser(tokens) {
    let current = 0;
    function walk() {
        let token = tokens[current];
        if (token.type === 'number') {
            current++;

            return {
                type: 'NumberLiteral',
                value: token.value
            };
        }
        if (token.type === 'paren' && token.value === '(') {
            token = tokens[++current];
            let node = {
                type: 'CallExpression',
                name: token.value,
                params: []
            };

            token = tokens[++current];

            while (token.type !== 'paren' ||
                token.type === 'paren' && token.value !== ')'
            ) {
                node.params.push(walk());
                token = tokens[current];
            }
            current++;

            return node;
        }

        throw new TypeError(token.type);
    }

    var ast = {
        type: 'Program',
        body: []
    };
    while (current < tokens.length) {
        ast.body.push(walk());
    }

    return ast;
}

function traverser(ast, visitor) {
    function traverseArray(array, parent) {
        array.forEach(child => {
            traverseNode(child, parent);
        });
    }

    function traverseNode(node, parent) {
        let method = visitor[node.type];
        if (method) {
            method(node, parent);
        }
        switch (node.type) {
            case 'Program':
                traverseArray(node.body, node);
                break;
            case 'CallExpression':
                traverseArray(node.params, node);
                break;
            case 'NumberLiteral':
                break;
            default:
                throw new TypeError(node.type);
        }
    }
    traverseNode(ast, null);
}

function transformer(ast) {
    var newAst = {
        type: 'Program',
        body: []
    };

    ast._context = newAst.body;

    traverser(ast, {
        NumberLiteral: (node, parent) => {
            parent._context.push({
                type: 'NumberLiteral',
                value: node.value
            });
        },
        CallExpression: (node, parent) => {
            let expression = {
                type: 'CallExpression',
                callee: {
                    type: "Identifier",
                    name: node.name
                },
                arguments: []
            };
            node._context = expression.arguments;
            if (parent.type !== 'CallExpression') {
                expression = {
                    type: 'ExpressionStatement',
                    expression: expression
                };
            }
            parent._context.push(expression);
        }
    });
    return newAst;
}

function codeGenerator(node) {
    switch (node.type) {
        case 'Program':
            return node.body.map(codeGenerator).join('\n');
        case 'ExpressionStatement':
            return (codeGenerator(node.expression) + ';');
        case 'CallExpression':
            return (codeGenerator(node.callee) + '(' +
                node.arguments.map(codeGenerator).join(', ') +
                ')');
        case 'Identifier':
            return node.name;
        case 'NumberLiteral':
            return node.value;
        default:
            throw new TypeError(node.type);
    }

}

module.exports = {
    tokenizer: tokenizer,
    parser: parser,
    transformer: transformer,
    codeGenerator: codeGenerator,
    compiler: compiler
};



function main() {
    let code = "(add 2 (sub 3 4))";
    let tokens = tokenizer(code);
    let ast = parser(tokens);
    let newAst = transformer(ast);
    console.log(tokens);
    console.log(ast);
    console.log(ast.body[0].params);
    console.log(newAst);
    console.log(newAst.body[0].expression.arguments[1]);
}

main()
