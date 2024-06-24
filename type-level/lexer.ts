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

export type TokenKind =
  | "CONTROL"
  | "OPERATOR"
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

export type Token = {
  kind: TokenKind;
  value: {
    CONTROL: string;
    OPERATOR: string;
    IDENT: string;
    INT_LIT: number;
    UINT_LIT: number;
    FLOAT_LIT: number;
    STRING_LIT: string;
    BYTE_LIT: string;
    BOOL_LIT: boolean;
    NULL_LIT: null;
    RESERVED: string;
    WHITESPACE: string;
    COMMENT: string;
  }[TokenKind];
};

type newToken<K extends TokenKind, V> = { kind: K; value: V };

type stringLength<S extends string, Acc extends never[] = []> =
  S extends `${infer _ extends string}${infer R extends string}`
  ? stringLength<R, [never, ...Acc]>
  : Acc["length"];

type hasPrefix<S extends string, P extends string[]> =
  matchPrefix<S, P> extends never ? false : true

type matchPrefix<S extends string, P extends string[]> =
  P extends [infer P1 extends string, ...infer P2 extends string[]]
  ? S extends `${P1}${infer _ extends string}`
    ? P1
    : matchPrefix<S, P2>
  : never;

type slicePrefix<S extends string, N extends number, Acc extends never[] = [], P extends string = ""> =
  Acc["length"] extends N
  ? P
  : S extends `${infer C extends string}${infer R extends string}`
    ? slicePrefix<R, N, [never, ...Acc], `${P}${C}`>
    : "";

type sliceSuffix<S extends string, N extends number, Acc extends never[] = []> =
  Acc["length"] extends N
  ? S
  : S extends `${infer _ extends string}${infer R extends string}`
    ? sliceSuffix<R, N, [never, ...Acc]>
    : "";

type Controls = ["?", ":", ".", "(", ")", "[", "]", "{", "}", ","];
// prettier-ignore
type Operators = ["||", "&&", "<", "<=", ">=", ">", "==", "!=", "in", "+", "-", "*", "/", "%", "!"];
// prettier-ignore
type Reserved =  ["as", "break", "const", "continue", "else", "for", "function", "if", "import", "let", "loop", "package", "namespace", "return", "var", "void", "while"];

type lexControl<I extends string, Ctrl extends string = matchPrefix<I, Controls>> = 
  Ctrl extends never 
  ? never 
  : [newToken<"CONTROL", Ctrl>, sliceSuffix<I, stringLength<Ctrl>>];

type lexOperator<I extends string, Op extends string = matchPrefix<I, Operators>> = 
  Op extends never
  ? never 
  : [newToken<"OPERATOR", Op>, sliceSuffix<I, stringLength<Op>>];

type lexReserved<I extends string, Rsrv extends string = matchPrefix<I, Reserved>> =
  Rsrv extends never
  ? never
  : [newToken<"RESERVED", Rsrv>, sliceSuffix<I, stringLength<Rsrv>>];

type makeCharUnion<S extends string> = 
  S extends `${infer C}${infer R}`
  ? C | makeCharUnion<R> 
  : never;

type LowerCaseAlphabets = makeCharUnion<"abcdefghijklmnopqrstuvwxyz">;
type UpperCaseAlphabets = makeCharUnion<"ABCDEFGHIJKLMNOPQRSTUVWXYZ">;
type Alphabets = LowerCaseAlphabets | UpperCaseAlphabets;
type Digits = makeCharUnion<"0123456789">;
type HexDigits = Digits | makeCharUnion<"abcdefABCDEF">;
type Underscore = "_";

type isIdentStart<C extends string> = C extends Alphabets | Underscore ? true : false;
type isIdentPart<C extends string> = C extends Alphabets | Underscore | Digits ? true : false;
type isDigit<C extends string> = C extends Digits ? true : false;
type isHexDigit<C extends string> = C extends HexDigits ? true : false;

type lexIdent<I extends string, V extends string = "", P extends string = slicePrefix<I, 1>> = 
  isIdentStart<P> extends true
  ? lexIdentSub<sliceSuffix<I, 1>, `${V}${P}`>
  : never;
type lexIdentSub<I extends string, V extends string = "", P extends string = slicePrefix<I, 1>> =
  isIdentPart<P> extends true
  ? lexIdentSub<sliceSuffix<I, 1>, `${V}${P}`>
  : [newToken<"IDENT", V>, I];

type parseNumber<S extends string> = S extends `${infer N extends number}` ? N : never

type lexUintLit<I extends string, Ret = lexIntLit<I>> =
  Ret extends [infer Tok extends Token, infer R extends string]
  ? hasPrefix<R, ['u', 'U']> extends true
    ? Tok["value"] extends infer V
      ? [newToken<"UINT_LIT", V>, sliceSuffix<R, 1>]
      : never
    : never
  : never

type lexIntLit<I extends string, V extends string = "", P extends string = slicePrefix<I, 1>> =
  isDigit<P> extends true
  ? lexIntLitSub<sliceSuffix<I, 1>, `${V}${P}`>
  : never;
type lexIntLitSub<I extends string, V extends string = "", P extends string = slicePrefix<I, 1>> =
  isDigit<P> extends true
  ? lexIntLitSub<sliceSuffix<I, 1>, `${V}${P}`>
  : [newToken<"INT_LIT", parseNumber<V>>, I];

