/*
IDENT          ::= [_a-zA-Z][_a-zA-Z0-9]* - RESERVED
LITERAL        ::= INT_LIT | UINT_LIT | FLOAT_LIT | STRING_LIT | BYTES_LIT
                 | BOOL_LIT | NULL_LIT
INT_LIT        ::= -? DIGIT+ | -? 0x HEXDIGIT+
UINT_LIT       ::= INT_LIT [uU]
FLOAT_LIT      ::= -? DIGIT* . DIGIT+ EXPONENT? | -? DIGIT+ EXPONENT
DIGIT          ::= [0-9]
HEXDIGIT       ::= [0-9abcdefABCDEF]
EXPONENT       ::= [eE] [+-]? DIGIT+
STRING_LIT     ::= [rR]? ( "    ~( " | NEWLINE )*  "
                         | '    ~( ' | NEWLINE )*  '
                         | """  ~"""*              """
                         | '''  ~'''*              '''
                         )
BYTES_LIT      ::= [bB] STRING_LIT
ESCAPE         ::= \ [abfnrtv\?"'`]
                 | \ x HEXDIGIT HEXDIGIT
                 | \ u HEXDIGIT HEXDIGIT HEXDIGIT HEXDIGIT
                 | \ U HEXDIGIT HEXDIGIT HEXDIGIT HEXDIGIT HEXDIGIT HEXDIGIT HEXDIGIT HEXDIGIT
                 | \ [0-3] [0-7] [0-7]
NEWLINE        ::= \r\n | \r | \n
BOOL_LIT       ::= "true" | "false"
NULL_LIT       ::= "null"
RESERVED       ::= BOOL_LIT | NULL_LIT | "in"
                 | "as" | "break" | "const" | "continue" | "else"
                 | "for" | "function" | "if" | "import" | "let"
                 | "loop" | "package" | "namespace" | "return"
                 | "var" | "void" | "while"
WHITESPACE     ::= [\t\n\f\r ]+
COMMENT        ::= '//' ~NEWLINE* NEWLINE
*/

export type Token =
  | ControlToken
  | IdentToken
  | IntLitToken
  | UintLitToken
  | FloatLitToken
  | StringLitToken
  | ByteLitToken
  | BoolLitToken
  | NullLitToken
  | ReservedToken
  | WhitespaceToken
  | CommentToken;

export class ControlToken {
  constructor(public readonly control: string) {}
}

export class OperatorToken {
  constructor(public readonly operator: string) {}
}

export class IdentToken {
  constructor(public readonly ident: string) {}
}

export class IntLitToken {
  constructor(public readonly value: number) {}
}

export class UintLitToken {
  constructor(public readonly value: number) {}
}

export class FloatLitToken {
  constructor(public readonly value: number) {}
}

export class StringLitToken {
  constructor(public readonly value: string) {}
}

export class ByteLitToken {
  constructor(public readonly value: string) {}
}

export class BoolLitToken {
  constructor(public readonly value: boolean) {}
}

export class NullLitToken {
  constructor(public readonly value: null = null) {}
}

export class ReservedToken {
  constructor(public readonly keyword: string) {}
}

export class WhitespaceToken {} // Ignored

export class CommentToken {} // Ignored

const CONTROLS: string[] = ["?", ":", ".", "(", ")", "[", "]", "{", "}", ","];
// prettier-ignore
const OPERATORS: string[] = ["||", "&&", "<", "<=", ">=", ">", "==", "!=", "in", "+", "-", "*", "/", "%", "!"];
// prettier-ignore
const RESERVED: string[] = ["as", "break", "const", "continue", "else", "for", "function", "if", "import", "let", "loop", "package", "namespace", "return", "var", "void", "while"];

export function lexer(input: string): Token[] {
  const tokens: Token[] = [];
  const lexers = [
    lexWhitespace,
    lexComment,
    lexControl, // Before lexIdent
    lexOperator, // Before lexIdent
    lexReserved, // Before lexIdent
    lexUintLit, // Before lexIntLit
    lexIntLit,
    lexStringLit,
    lexByteLit,
    lexBoolLit,
    lexNullLit,
    lexIdent,
  ];
  while (input !== "") {
    let found = false;
    for (const lexer of lexers) {
      const lexed = lexer(input);
      if (lexed !== undefined) {
        const [token, rest] = lexed;
        tokens.push(token);
        input = rest;
        found = true;
        break;
      }
    }
    if (!found) {
      throw new Error(`Unexpected character: ${input[0]}`);
    }
  }
  return tokens.filter((token) => !(token instanceof WhitespaceToken || token instanceof CommentToken));
}

function lexControl(input: string): [ControlToken, string] | undefined {
  for (const control of CONTROLS) {
    if (input.startsWith(control)) {
      return [new ControlToken(control), input.slice(1)];
    }
  }
  return undefined;
}

function lexOperator(input: string): [OperatorToken, string] | undefined {
  for (const operator of OPERATORS) {
    if (input.startsWith(operator)) {
      return [new OperatorToken(operator), input.slice(operator.length)];
    }
  }
  return undefined;
}

function isIdentStart(c: string): boolean {
  return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_";
}

function isIdentPart(c: string): boolean {
  return isIdentStart(c) || (c >= "0" && c <= "9");
}

function lexIdent(input: string): [Token, string] | undefined {
  let ident = "";
  if (!isIdentStart(input[0])) {
    return undefined;
  }
  while (isIdentPart(input[0])) {
    ident += input[0];
    input = input.slice(1);
  }
  return [new IdentToken(ident), input];
}

function isDigit(c: string): boolean {
  return c >= "0" && c <= "9";
}

function isHexDigit(c: string): boolean {
  return (c >= "0" && c <= "9") || (c >= "a" && c <= "f") || (c >= "A" && c <= "F");
}

function lexUintLit(input: string): [UintLitToken, string] | undefined {
  const lexed = lexIntLit(input);
  if (lexed === undefined) {
    return undefined;
  }
  const [token, rest] = lexed;
  if (input.startsWith("u") || input.startsWith("U")) {
    return [new UintLitToken(token.value), rest.slice(1)];
  }
  return undefined;
}

function lexIntLit(input: string): [IntLitToken, string] | undefined {
  const lexers = [lexIntLitDec, lexIntLitHex];
  for (const lexer of lexers) {
    const lexed = lexer(input);
    if (lexed !== undefined) {
      return lexed;
    }
  }
  return undefined;
}

function lexIntLitDec(input: string): [IntLitToken, string] | undefined {
  let positive = true;
  if (input.startsWith("-")) {
    positive = false;
    input = input.slice(1);
  }
  let digits = "";
  if (!isDigit(input[0])) {
    return undefined;
  }
  while (isDigit(input[0])) {
    digits += input[0];
    input = input.slice(1);
  }
  return [new IntLitToken(parseInt(digits) * (positive ? 1 : -1)), input];
}

function lexIntLitHex(input: string): [IntLitToken, string] | undefined {
  let positive = true;
  if (input.startsWith("-")) {
    positive = false;
    input = input.slice(1);
  }
  if (input.startsWith("0x")) {
    input = input.slice(2);
    let digits = "";
    if (!isHexDigit(input[0])) {
      return undefined;
    }
    while (isHexDigit(input[0])) {
      digits += input[0];
      input = input.slice(1);
    }
    return [new IntLitToken(parseInt(digits, 16) * (positive ? 1 : -1)), input];
  }
  return undefined;
}

function lexFloatWithDot(input: string): [FloatLitToken, string] | undefined {
  let positive = true;
  if (input.startsWith("-")) {
    positive = false;
    input = input.slice(1);
  }
  let digits = "";
  while (isDigit(input[0])) {
    digits += input[0];
    input = input.slice(1);
  }

  if (!input.startsWith(".")) {
    return undefined;
  }
  input = input.slice(1);

  let decimals = "";
  while (isDigit(input[0])) {
    decimals += input[0];
    input = input.slice(1);
  }
  if (decimals === "") {
    return undefined;
  }
  const lexed = lexExponent(input);
  if (lexed === undefined) {
    return [new FloatLitToken(parseFloat(`${digits}.${decimals}`)), input];
  }
  const [exponent, rest] = lexed;
  return [new FloatLitToken(parseFloat(`${digits}.${decimals}e${exponent}`) * (positive ? 1 : -1)), rest];
}

function lexFloatWithoutDot(input: string): [FloatLitToken, string] | undefined {
  let positive = true;
  if (input.startsWith("-")) {
    positive = false;
    input = input.slice(1);
  }
  let digits = "";
  while (isDigit(input[0])) {
    digits += input[0];
    input = input.slice(1);
  }
  if (digits === "") {
    return undefined;
  }
  const lexed = lexExponent(input);
  if (lexed === undefined) {
    return undefined;
  }
  const [exponent, rest] = lexed;
  return [new FloatLitToken(parseFloat(`${digits}e${exponent}`) * (positive ? 1 : -1)), rest];
}

function lexExponent(input: string): [number, string] | undefined {
  if (!(input.startsWith("e") || input.startsWith("E"))) {
    return undefined;
  }
  input = input.slice(1);
  let positive = true;
  if (input.startsWith("+") || input.startsWith("-")) {
    if (input.startsWith("-")) {
      positive = false;
    }
    input = input.slice(1);
  }
  let exponent = "";
  while (isDigit(input[0])) {
    exponent += input[0];
    input = input.slice(1);
  }
  if (exponent === "") {
    return undefined;
  }
  return [parseFloat(exponent) * (positive ? 1 : -1), input];
}

function lexStringLit(input: string): [StringLitToken, string] | undefined {
  let raw = false;
  if (input.startsWith("r") || input.startsWith("R")) {
    raw = true;
    input = input.slice(1);
  }
  const lexers = [lexStringLitSingle, lexStringLitMulti];
  for (const lexer of lexers) {
    const lexed = lexer(input);
    if (lexed !== undefined) {
      const [str, rest] = lexed;
      const token = new StringLitToken(raw ? String.raw`${str}` : str); // TODO: Make sure this works
      return [token, rest];
    }
  }
  return undefined;
}

function lexStringLitSingle(input: string): [string, string] | undefined {
  if (input.startsWith(`"`) || input.startsWith(`'`)) {
    const quote = input[0];
    input = input.slice(1);

    let str = "";
    let escape = false;
    while (true) {
      if (input[0] == "\\") {
        escape = true;
        input = input.slice(1);
        continue;
      }
      if (startsWithNewline(input)) {
        return undefined;
      }
      if (input.startsWith(quote) && !escape) {
        return [str, input.slice(1)];
      }
      str += input[0];
      input = input.slice(1);
    }
  }
  return undefined;
}

function lexStringLitMulti(input: string): [string, string] | undefined {
  if (input.startsWith(`"""`) || input.startsWith(`'''`)) {
    const quote = input.slice(0, 3);
    input = input.slice(3);

    let str = "";
    while (true) {
      if (input.startsWith(quote)) {
        return [str, input.slice(str.length + 3)];
      }
      str += input[0];
      input = input.slice(1);
    }
  }
  return undefined;
}

function lexByteLit(input: string): [ByteLitToken, string] | undefined {
  if (input.startsWith("b") || input.startsWith("B")) {
    const lexed = lexStringLit(input.slice(1));
    if (lexed === undefined) {
      return undefined;
    }
    const [token, rest] = lexed;
    return [new ByteLitToken(token.value), rest];
  }
  return undefined;
}

function lexBoolLit(input: string): [BoolLitToken, string] | undefined {
  if (input.startsWith("true")) {
    return [new BoolLitToken(true), input.slice(4)];
  }
  if (input.startsWith("false")) {
    return [new BoolLitToken(false), input.slice(5)];
  }
  return undefined;
}

function lexNullLit(input: string): [NullLitToken, string] | undefined {
  if (input.startsWith("null")) {
    return [new NullLitToken(), input.slice(4)];
  }
  return undefined;
}

function lexReserved(input: string): [ReservedToken, string] | undefined {
  for (const reserved of RESERVED) {
    if (input.startsWith(reserved)) {
      return [new ReservedToken(reserved), input.slice(reserved.length)];
    }
  }
  return undefined;
}

function startsWithNewline(str: string): boolean {
  return str.startsWith("\r\n") || str.startsWith("\r") || str.startsWith("\n");
}

function startsWithWhitespace(str: string): boolean {
  return (
    str.startsWith(" ") || str.startsWith("\t") || str.startsWith("\n") || str.startsWith("\f") || str.startsWith("\r")
  );
}

function lexWhitespace(input: string): [WhitespaceToken, string] | undefined {
  if (!startsWithWhitespace(input)) {
    return undefined;
  }
  while (true) {
    if (startsWithWhitespace(input)) {
      input = input.slice(1);
      continue;
    }
    break;
  }
  return [new WhitespaceToken(), input];
}

function lexComment(input: string): [CommentToken, string] | undefined {
  if (input.startsWith("//")) {
    while (true) {
      if (startsWithNewline(input)) {
        // TODO: Simplify this
        const length = input.startsWith("\r\n") ? 2 : 1;
        return [new CommentToken(), input.slice(length)];
      }
      input = input.slice(1);
    }
  }
  return undefined;
}

function testLexer() {
  const input = `!!(myNum == 123 && (myStr == "hello" || myBool == true) ? myNum + 1 == 2 : -myNum - 1 == 10)`;
  const lexed = lexer(input);
  for (const token of lexed) {
    console.log(token);
  }
}

testLexer();
