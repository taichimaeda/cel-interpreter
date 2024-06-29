/***********************************************************/
/*                        Strings                          */
/***********************************************************/

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

export type isIdentStart<C extends string> = C extends Alphabets | Underscore ? true : false;
export type isIdentPart<C extends string> = C extends Alphabets | Underscore | Digits ? true : false;
export type isDigit<C extends string> = C extends Digits ? true : false;
export type isHexDigit<C extends string> = C extends HexDigits ? true : false;
export type evalHexDigit<C extends string> = C extends HexDigits ? {
  "0": 0,
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "a": 10,
  "b": 11,
  "c": 12,
  "d": 13,
  "e": 14,
  "f": 15,
  "A": 10,
  "B": 11,
  "C": 12,
  "D": 13,
  "E": 14,
  "F": 15,
}[C] : never

export type stringLength<S extends string, Acc extends never[] = []> =
  S extends `${infer _ extends string}${infer R extends string}`
  ? stringLength<R, [never, ...Acc]>
  : Acc["length"];

export type hasPrefix<S extends string, P extends string[]> =
  matchPrefix<S, P> extends never ? false : true

export type matchPrefix<S extends string, P extends string[]> =
  P extends [infer P1 extends string, ...infer P2 extends string[]]
  ? S extends `${P1}${infer _ extends string}`
  ? P1
  : matchPrefix<S, P2>
  : never;

export type takePrefix<S extends string, N extends number, Acc extends never[] = [], P extends string = ""> =
  Acc["length"] extends N
  ? P
  : S extends `${infer C extends string}${infer R extends string}`
  ? takePrefix<R, N, [never, ...Acc], `${P}${C}`>
  : "";

export type takeSuffix<S extends string, N extends number, Acc extends never[] = []> =
  Acc["length"] extends N
  ? S
  : S extends `${infer _ extends string}${infer R extends string}`
  ? takeSuffix<R, N, [never, ...Acc]>
  : "";

/***********************************************************/
/*                        Numbers                          */
/***********************************************************/

type toTuple<N extends number, T extends unknown[] = []> =
  T['length'] extends N ? T : toTuple<N, [unknown, ...T]>;

export type asNumber<N extends unknown> = 
  N extends number ? N : never;

export type add<X extends number, Y extends number> = 
  [...toTuple<X>, ...toTuple<Y>]['length'];

export type subtract<X extends number, Y extends number> =
  toTuple<X> extends [...infer D, ...toTuple<Y>] ? D['length'] : 0;   

export type mult<X extends number, Y extends number> = 
  Y extends 0 
  ? 0 
  : add<X, asNumber<mult<X, subtract<Y, 1>>>>

export type div<X extends number, Y extends number, Q extends number = 0> =
  X extends 0 
  ? Q 
  : div<subtract<X, Y>, Y, asNumber<add<Q, 1>>>;

export type mod<X extends number, Y extends number> =
  subtract<X, asNumber<mult<Y, asNumber<div<X, Y>>>>>;

export type parseNumber<S extends string> = S extends `${infer N extends number}` ? N : never

// export type parseHexNumber<S extends string, V extends number = 0> =
//   S extends ""
//   ? V 
//   : parseHexNumber<takeSuffix<S, 1>, asNumber<add<asNumber<mult<V, 16>>, evalHexDigit<takePrefix<S, 1>>>>>

export type negateNumber<N extends number> =
  `-${N}` extends `${infer M1 extends number}`
  ? M1
  : `${N}` extends `-${infer M2 extends number}`
    ? M2
    : never;

/***********************************************************/
/*                       Relations                         */
/***********************************************************/

export type isLessThan<X extends number, Y extends number> =
  toTuple<X> extends [infer R extends [unknown], ...infer Y] ? true : false

export type isLessThanOrEqual<X extends number, Y extends number> =
  isLessThan<X, Y> extends true
  ? true 
  : X extends Y ? true : false

export type isGreaterThan<X extends number, Y extends number> =
  isLessThanOrEqual<X, Y> extends true ? false : true

export type isGreaterThanOrEqual<X extends number, Y extends number> =
  isLessThan<X, Y> extends true ? false : true

export type isEqual<X extends number, Y extends number> =
  X extends Y
  ? Y extends X ? true : false
  : false


