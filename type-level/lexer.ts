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

import { hasPrefix, isDigit, isIdentPart, isIdentStart, matchPrefix, parseNumber, stringLength, takePrefix, takeSuffix } from "./util";

export type Token =
  | ControlToken
  | OperatorToken
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

export type TokenKind = Token["kind"];

export type ControlToken = {
  kind: "CONTROL";
  value: string;
};

export type OperatorToken = {
  kind: "OPERATOR";
  value: string;
};

export type IdentToken = {
  kind: "IDENT";
  value: string;
};

export type IntLitToken = {
  kind: "INT_LIT";
  value: number;
};

export type UintLitToken = {
  kind: "UINT_LIT";
  value: number;
};

export type FloatLitToken = {
  kind: "FLOAT_LIT";
  value: number;
};

export type StringLitToken = {
  kind: "STRING_LIT";
  value: string;
};

export type ByteLitToken = {
  kind: "BYTE_LIT";
  value: string;
};

export type BoolLitToken = {
  kind: "BOOL_LIT";
  value: boolean;
};

export type NullLitToken = {
  kind: "NULL_LIT";
  value: null;
};

export type ReservedToken = {
  kind: "RESERVED";
  value: string;
};

export type WhitespaceToken = {
  kind: "WHITESPACE";
  value: string;
};

export type CommentToken = {
  kind: "COMMENT";
  value: string;
};

type newControlToken<C extends string> = { kind: "CONTROL"; value: C };
type newOperatorToken<O extends string> = { kind: "OPERATOR"; value: O };
type newIdentToken<V extends string> = { kind: "IDENT"; value: V };
type newIntLitToken<V extends number> = { kind: "INT_LIT"; value: V };
type newUintLitToken<V extends number> = { kind: "UINT_LIT"; value: V };
type newFloatLitToken<V extends number> = { kind: "FLOAT_LIT"; value: V };
type newStringLitToken<V extends string> = { kind: "STRING_LIT"; value: V };
type newByteLitToken<V extends string> = { kind: "BYTE_LIT"; value: V };
type newBoolLitToken<V extends boolean> = { kind: "BOOL_LIT"; value: V };
type newNullLitToken<V extends null> = { kind: "NULL_LIT"; value: V };
type newReservedToken<V extends string> = { kind: "RESERVED"; value: V };
type newWhitespaceToken<V extends string> = { kind: "WHITESPACE"; value: V };
type newCommentToken<V extends string> = { kind: "COMMENT"; value: V };

type Controls = ["?", ":", ".", "(", ")", "[", "]", "{", "}", ","];
// prettier-ignore
type Operators = ["||", "&&", "<", "<=", ">=", ">", "==", "!=", "in", "+", "-", "*", "/", "%", "!"];
// prettier-ignore
type Reserved =  ["as", "break", "const", "continue", "else", "for", "function", "if", "import", "let", "loop", "package", "namespace", "return", "var", "void", "while"];

type lexControl<I extends string, Ctrl extends string = matchPrefix<I, Controls>> = 
  Ctrl extends never 
  ? never 
  : [newControlToken<Ctrl>, takeSuffix<I, stringLength<Ctrl>>];

type lexOperator<I extends string, Op extends string = matchPrefix<I, Operators>> = 
  Op extends never
  ? never 
  : [newOperatorToken<Op>, takeSuffix<I, stringLength<Op>>];

type lexReserved<I extends string, Rsrv extends string = matchPrefix<I, Reserved>> =
  Rsrv extends never
  ? never
  : [newReservedToken<Rsrv>, takeSuffix<I, stringLength<Rsrv>>];

type lexIdent<I extends string, V extends string = "", P extends string = takePrefix<I, 1>> = 
  isIdentStart<P> extends true
  ? lexIdentSub<takeSuffix<I, 1>, `${V}${P}`>
  : never;
type lexIdentSub<I extends string, V extends string = "", P extends string = takePrefix<I, 1>> =
  isIdentPart<P> extends true
  ? lexIdentSub<takeSuffix<I, 1>, `${V}${P}`>
  : [newIdentToken<V>, I];

type lexUintLit<I extends string, Ret = lexIntLit<I>> =
  Ret extends [infer Tok extends Token, infer R extends string]
  ? hasPrefix<R, ['u', 'U']> extends true
    ? Tok["value"] extends infer V extends number
      ? [newUintLitToken<V>, takeSuffix<R, 1>]
      : never
    : never
  : never

type lexIntLit<I extends string, RetDec = lexIntLitDec<I>, RetHex = lexIntLitHex<I>> =
  RetDec extends never
  ? RetHex
  : RetDec

type lexIntLitDec<I extends string> =
  hasPrefix<I, ["-"]> extends true
  ? lexIntLitDecSub1<takeSuffix<I, 1>, takePrefix<I, 1>>
  : lexIntLitDecSub1<I, "">;
type lexIntLitDecSub1<I extends string, V extends string = "", P extends string = takePrefix<I, 1>> =
  isDigit<P> extends true
  ? lexIntLitDecSub2<takeSuffix<I, 1>, `${V}${P}`>
  : never;
type lexIntLitDecSub2<I extends string, V extends string = "", P extends string = takePrefix<I, 1>> =
  isDigit<P> extends true
  ? lexIntLitDecSub2<takeSuffix<I, 1>, `${V}${P}`>
  : [newIntLitToken<parseNumber<V>>, I];

// TODO: `lexIntLitHex` fails with possibly infinite recursion
type lexIntLitHex<I extends string> = newIntLitToken<0>;
// type lexIntLitHex<I extends string, V extends string = ""> =
//   hasPrefix<I, ["-"]> extends true
//   ? lexIntLitHexSub1<takeSuffix<I, 1>, `${V}${takePrefix<I, 1>}`>
//   : lexIntLitHexSub1<I, V>;
// type lexIntLitHexSub1<I extends string, V extends string = ""> =
//   takePrefix<I, 2> extends "0x"
//   ? lexIntLitHexSub2<takeSuffix<I, 2>, V>
//   : never;
// type lexIntLitHexSub2<I extends string, V extends string = "", P extends string = takePrefix<I, 1>> =
//   isHexDigit<P> extends true
//   ? lexIntLitHexSub3<takeSuffix<I, 1>, `${V}${P}`>
//   : never;
// type lexIntLitHexSub3<I extends string, V extends string = "", P extends string = takePrefix<I, 1>> =
//   isHexDigit<P> extends true
//   ? lexIntLitHexSub3<takeSuffix<I, 1>, `${V}${P}`>
//   : [newIntLitToken<parseHexNumber<V>>, I];

type lexFloat<I extends string, RetWithDot = lexFloatWithDot<I>, RetWithoutDot = lexFloatWithoutDot<I>> =
  RetWithDot extends never
  ? RetWithoutDot
  : RetWithDot;

type lexFloatWithDot<I extends string, P extends string = takePrefix<I, 1>> =
  P extends "-"
  ? lexFloatWithDotSub1<takeSuffix<I, 1>, P>
  : lexFloatWithDotSub1<I, "">;
type lexFloatWithDotSub1<I extends string, V extends string, P extends string = takePrefix<I, 1>> =
  isDigit<P> extends true
  ? lexFloatWithDotSub1<takeSuffix<I, 1>, `${V}${P}`>
  : lexFloatWithDotSub2<I, V>;
type lexFloatWithDotSub2<I extends string, V extends string> =
  hasPrefix<I, ['.']> extends true
  ? lexFloatWithDotSub3<takeSuffix<I, 1>, `${V}.`>
  : never;
type lexFloatWithDotSub3<I extends string, V extends string, P extends string = takePrefix<I, 1>> =
  isDigit<P> extends true
  ? lexFloatWithDotSub3<takeSuffix<I, 1>, `${V}${P}`>
  : lexFloatWithouDotSub4<I, V>;
type lexFloatWithouDotSub4<I extends string, V extends string> =
  lexExponent<I> extends [infer E extends number, infer R extends string]
  ? [newFloatLitToken<parseNumber<V>>, R]
  : never;

// TODO: `lexFloatWithoutDot` fails because `parseNumber` does not handle scientific notation
type lexFloatWithoutDot<I extends string> = newFloatLitToken<0>;
// type lexFloatWithoutDot<I extends string, P extends string = takePrefix<I, 1>> =
//   P extends "-"
//   ? lexFloatWithoutDotSub1<takeSuffix<I, 1>, P>
//   : lexFloatWithoutDotSub1<I, "">;
// type lexFloatWithoutDotSub1<I extends string, V extends string = "", P extends string = takePrefix<I, 1>> =
//   isDigit<P> extends true
//   ? lexFloatWithoutDotSub2<takeSuffix<I, 1>, P>
//   : never;
// type lexFloatWithoutDotSub2<I extends string, V extends string, P extends string = takePrefix<I, 1>> =
//   isDigit<P> extends true
//   ? lexFloatWithoutDotSub2<takeSuffix<I, 1>, `${V}${P}`>
//   : lexFloatWithoutDotSub3<I, V>;
// type lexFloatWithoutDotSub3<I extends string, V extends string, P extends string = takePrefix<I, 1>> =
//   isDigit<P> extends true
//   ? lexFloatWithoutDotSub3<takeSuffix<I, 1>, `${V}${P}`>
//   : lexFloatWithoutDotSub4<I, V>;
// type lexFloatWithoutDotSub4<I extends string, V extends string> =
//   lexExponent<I> extends [infer E extends number, infer R extends string]
//   ? [newFloatLitToken<parseNumber<V>>, R]
//   : never;

// TODO: `lexFloatWithoutDot` fails because `parseNumber` does not handle scientific notation
type lexExponent<I extends string> = [0, I];
// type lexExponent<I extends string, P extends string = takePrefix<I, 1>> =
//   P extends "e" | "E"
//   ? lexExponentSub1<takeSuffix<I, 1>, P>
//   : 4;
// type lexExponentSub1<I extends string, E extends string, P extends string = takePrefix<I, 1>> =
//   P extends "+" | "-"
//   ? lexExponentSub2<takeSuffix<I, 1>, `${E}${P}`>
//   : lexExponentSub2<I, E>;
// type lexExponentSub2<I extends string, E extends string, P extends string = takePrefix<I, 1>> =
//   isDigit<P> extends true
//   ? lexExponentSub3<I, E>
//   : 5;
// type lexExponentSub3<I extends string, E extends string, P extends string = takePrefix<I, 1>> =
//   isDigit<P> extends true
//   ? lexExponentSub3<takeSuffix<I, 1>, `${E}${takePrefix<I, 1>}`>
//   : [parseNumber<E>, I];








// function lexStringLit(input: string): [StringLitToken, string] | undefined {
//   let raw = false;
//   if (input.startsWith("r") || input.startsWith("R")) {
//     raw = true;
//     input = input.slice(1);
//   }
//   const lexers = [lexStringLitSingle, lexStringLitMulti];
//   for (const lexer of lexers) {
//     const lexed = lexer(input);
//     if (lexed !== undefined) {
//       const [str, rest] = lexed;
//       const token = new StringLitToken(raw ? String.raw`${str}` : str); // TODO: Make sure this works
//       return [token, rest];
//     }
//   }
//   return undefined;
// }

// function lexStringLitSingle(input: string): [string, string] | undefined {
//   if (input.startsWith(`"`) || input.startsWith(`'`)) {
//     const quote = input[0];
//     input = input.slice(1);

//     let str = "";
//     let escape = false;
//     while (true) {
//       if (input[0] == "\\") {
//         escape = true;
//         input = input.slice(1);
//         continue;
//       }
//       if (startsWithNewline(input)) {
//         return undefined;
//       }
//       if (input.startsWith(quote) && !escape) {
//         return [str, input.slice(1)];
//       }
//       str += input[0];
//       input = input.slice(1);
//     }
//   }
//   return undefined;
// }

// function lexStringLitMulti(input: string): [string, string] | undefined {
//   if (input.startsWith(`"""`) || input.startsWith(`'''`)) {
//     const quote = input.slice(0, 3);
//     input = input.slice(3);

//     let str = "";
//     while (true) {
//       if (input.startsWith(quote)) {
//         return [str, input.slice(str.length + 3)];
//       }
//       str += input[0];
//       input = input.slice(1);
//     }
//   }
//   return undefined;
// }


type lexStringLit<I extends string> = never;

type lexStringLitSingle<I extends string, Q extends string = takePrefix<I, 1>> =
  Q extends '"' | "'"
  ? lexStringLitSingleSub<I, Q>
  : never;
type lexStringLitSingleSub<I extends string, Q extends string, V extends string = "", Esc extends boolean = false> =
  takePrefix<I, 2> extends "\\"
  ? lexStringLitSingleSub<takeSuffix<I, 1>, Q, V, true>
  : [takePrefix<I, 1>, Esc] extends [Q, true]
    ? [newStringLitToken<V>, takeSuffix<I, 1>]
    : lexStringLitSingleSub<takeSuffix<I, 1>, Q, `${V}${takePrefix<I, 1>}`, false>;

type a = lexStringLitSingle<'"abc"'>;
