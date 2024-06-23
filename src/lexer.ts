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

type TokenKind =
  | "IDENT"
  | "INT_LIT"
  | "UINT_LIT"
  | "FLOAT_LIT"
  | "STRING_LIT"
  | "BYTE_LIT"
  | "BOOL_LIT"
  | "NULL_LIT"
  | "RESERVED"
  | "WHITESPACE"
  | "COMMENT";
type TokenType =
  | "INT"
  | "UINT"
  | "DOUBLE"
  | "BOOL"
  | "STRING"
  | "BYTES"
  | "NULL";
type byte = Uint8Array;
type TokenValue = number | string | boolean | Uint8Array | null;

class Token {
  constructor(
    public readonly type: TokenKind,
    public readonly value: TokenValue
  ) {}
}

const NEWLINE_CHARS: string[] = ["\r\n", "\r", "\n"];
const WHITESPACE_CHARS: string[] = [" ", "\t", "\n", "\f", "\r"];
const RESERVED_KEYWORDS: string[] = [
  "as",
  "break",
  "const",
  "continue",
  "else",
  "for",
  "function",
  "if",
  "import",
  "let",
  "loop",
  "package",
  "namespace",
  "return",
  "var",
  "void",
  "while",
];

function lexer(input: string): Token[] {
  const tokens: Token[] = [];
  const lexers = [
    lexReserved, // Before lexIdent
    lexIdent,
    lexUintLit, // Before lexIntLit
    lexIntLit,
    lexStringLit,
    lexByteLit,
    lexBoolLit,
    lexNullLit,
    lexWhitespace,
    lexComment,
  ];
  while (input !== "") {
    for (const lexer of lexers) {
      const lexed = lexer(input);
      if (lexed !== undefined) {
        const [token, rest] = lexed;
        tokens.push(token);
        input = rest;
        break;
      }
    }
    throw new Error(`Unexpected character: ${input[0]}`);
  }
  return tokens;
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
  return [new Token("IDENT", ident), input];
}

function isDigit(c: string): boolean {
  return c >= "0" && c <= "9";
}

function isHexDigit(c: string): boolean {
  return (
    (c >= "0" && c <= "9") || (c >= "a" && c <= "f") || (c >= "A" && c <= "F")
  );
}

function lexUintLit(input: string): [Token, string] | undefined {
  const lexed = lexIntLit(input);
  if (lexed === undefined) {
    return undefined;
  }
  const [token, rest] = lexed;
  if (input.startsWith("u") || input.startsWith("U")) {
    return [new Token("UINT_LIT", token.value), rest.slice(1)];
  }
  return undefined;
}

function lexIntLit(input: string): [Token, string] | undefined {
  const lexers = [lexIntLitDec, lexIntLitHex];
  for (const lexer of lexers) {
    const lexed = lexer(input);
    if (lexed !== undefined) {
      return lexed;
    }
  }
  return undefined;
}

function lexIntLitDec(input: string): [Token, string] | undefined {
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
  return [new Token("INT_LIT", parseInt(digits) * (positive ? 1 : -1)), input];
}

function lexIntLitHex(input: string): [Token, string] | undefined {
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
    return [
      new Token("INT_LIT", parseInt(digits, 16) * (positive ? 1 : -1)),
      input,
    ];
  }
  return undefined;
}

function lexFloatWithDot(input: string): [Token, string] | undefined {
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
    return [new Token("FLOAT_LIT", parseFloat(`${digits}.${decimals}`)), input];
  }
  const [exponent, rest] = lexed;
  return [
    new Token(
      "FLOAT_LIT",
      parseFloat(`${digits}.${decimals}e${exponent}`) * (positive ? 1 : -1)
    ),
    rest,
  ];
}

function lexFloatWithoutDot(input: string): [Token, string] | undefined {
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
  return [
    new Token(
      "FLOAT_LIT",
      parseFloat(`${digits}e${exponent}`) * (positive ? 1 : -1)
    ),
    rest,
  ];
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

function lexStringLit(input: string): [Token, string] | undefined {
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
      const token = new Token("STRING_LIT", raw ? String.raw`${str}` : str); // TODO: Make sure this works
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
      for (const newline of NEWLINE_CHARS) {
        if (input.startsWith(newline)) {
          return undefined;
        }
      }
      if (input.startsWith(quote) && !escape) {
        return [str, input.slice(str.length + 1)];
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

function lexByteLit(input: string): [Token, string] | undefined {
  if (input.startsWith("b") || input.startsWith("B")) {
    const lexed = lexStringLit(input.slice(1));
    if (lexed === undefined) {
      return undefined;
    }
    const [token, rest] = lexed;
    return [new Token("BYTE_LIT", token.value), rest];
  }
  return undefined;
}

function lexBoolLit(input: string): [Token, string] | undefined {
  if (input.startsWith("true")) {
    return [new Token("BOOL_LIT", true), input.slice(4)];
  }
  if (input.startsWith("false")) {
    return [new Token("BOOL_LIT", false), input.slice(5)];
  }
  return undefined;
}

function lexNullLit(input: string): [Token, string] | undefined {
  if (input.startsWith("null")) {
    return [new Token("NULL_LIT", null), input.slice(4)];
  }
  return undefined;
}

function lexReserved(input: string): [Token, string] | undefined {
  for (const keyword of RESERVED_KEYWORDS) {
    if (input.startsWith(keyword)) {
      return [new Token("RESERVED", keyword), input.slice(keyword.length)];
    }
  }
  return undefined;
}

function lexWhitespace(input: string): [Token, string] | undefined {
  let whitespace = "";
  while (true) {
    for (const char of WHITESPACE_CHARS) {
      if (input.startsWith(char)) {
        whitespace += char;
        input = input.slice(char.length);
        continue;
      }
    }
    break;
  }
  if (whitespace === "") {
    return undefined;
  }
  return [new Token("WHITESPACE", whitespace), input.slice(whitespace.length)];
}

function lexComment(input: string): [Token, string] | undefined {
  let comment = "";
  if (input.startsWith("//")) {
    while (true) {
      for (const char of NEWLINE_CHARS) {
        if (input.startsWith(char)) {
          return [
            new Token("COMMENT", comment),
            input.slice(comment.length + char.length),
          ];
        }
      }
      comment += input[0];
      input = input.slice(1);
    }
  }
  return undefined;
}
