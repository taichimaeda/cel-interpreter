/*
Expr           ::= ConditionalOr ["?" ConditionalOr ":" Expr] ;
ConditionalOr  ::= [ConditionalOr "||"] ConditionalAnd ;
ConditionalAnd ::= [ConditionalAnd "&&"] Relation ;
Relation       ::= [Relation Relop] Addition ;
Relop          ::= "<" | "<=" | ">=" | ">" | "==" | "!=" | "in" ;
Addition       ::= [Addition ("+" | "-")] Multiplication ;
Multiplication ::= [Multiplication ("*" | "/" | "%")] Unary ;
Unary          ::= Member
               | "!" {"!"} Member
               | "-" {"-"} Member
               ;
Member         ::= Primary
               | Member "." IDENT ["(" [ExprList] ")"]
               | Member "[" Expr "]"
               ;
Primary        ::= ["."] IDENT ["(" [ExprList] ")"]
               | "(" Expr ")"
               | "[" [ExprList] [","] "]"
               | "{" [MapInits] [","] "}"
               | ["."] IDENT { "." IDENT } "{" [FieldInits] [","] "}"
               | LITERAL
               ;
ExprList       ::= Expr {"," Expr} ;
FieldInits     ::= IDENT ":" Expr {"," IDENT ":" Expr} ;
MapInits       ::= Expr ":" Expr {"," Expr ":" Expr} ;
*/

/*
NOTE:
* Skipping LL(1) grammar for convenience
* Skipping error handling for convenience
* Skipping field selection because protobuf support is not implemented
* Skipping field inits because protobuf support is not implemented
* Skipping partial evaluation
*/

/*
NOTE:
Member  ::= Primary
        | Member [["." IDENT] "(" [ExprList] ")"]
        | Member "[" Expr "]"
        ;
Primary ::= LITERAL
        | IDENT
        | "(" Expr ")"
        | "[" [ExprList] [","] "]"
        | "{" [MapInits] [","] "}" 
        ;
*/
import {
  BoolLitToken,
  ByteLitToken,
  ControlToken,
  FloatLitToken,
  IdentToken,
  IntLitToken,
  lexer,
  NullLitToken,
  OperatorToken,
  StringLitToken,
  Token,
  UintLitToken,
} from "./lexer";

export type Expr = OrExpr | TernaryExpr;

export class TernaryExpr {
  constructor(public readonly cond: OrExpr, public readonly then?: OrExpr, public readonly els?: Expr) {}
}

export class OrExpr {
  constructor(public readonly exprs: AndExpr[]) {}
}

export class AndExpr {
  constructor(public readonly exprs: RelExpr[]) {}
}

export class RelExpr {
  constructor(public readonly exprs: AddExpr[], public readonly ops: string[]) {}
}

export class AddExpr {
  constructor(public readonly exprs: MultExpr[], public readonly ops: string[]) {}
}

export class MultExpr {
  constructor(public readonly exprs: UnaryExpr[], public readonly ops: string[]) {}
}

export class UnaryExpr {
  constructor(public readonly member: Member, public readonly ops: string[]) {}
}

export type Member = Primary | FuncCallExpr | IndexExpr;

export type Primary = Literal | Ident | Expr | ListExpr | MapExpr;

export type Literal = IntLit | UintLit | FloatLit | StringLit | ByteLit | BoolLit | NullLit;

export class IntLit {
  constructor(public readonly value: number) {}
}

export class UintLit {
  constructor(public readonly value: number) {}
}

export class FloatLit {
  constructor(public readonly value: number) {}
}

export class StringLit {
  constructor(public readonly value: string) {}
}

export class ByteLit {
  constructor(public readonly value: string) {}
}

export class BoolLit {
  constructor(public readonly value: boolean) {}
}

export class NullLit {
  constructor(public readonly value: null = null) {}
}

export class ListExpr {
  constructor(public readonly exprs: Expr[]) {}
}

export class MapExpr {
  constructor(public readonly exprs: [Expr, Expr][]) {}
}

export class Ident {
  constructor(public readonly name: string) {}
}

export class IndexExpr {
  constructor(public readonly member: Member, public readonly index: Expr) {}
}

export class FuncCallExpr {
  constructor(public readonly member: Member, public readonly exprs: Expr[]) {}
}

export function parser(tokens: Token[]): Expr {
  const ret = parseExpr(tokens);
  if (ret === undefined) {
    throw new Error("Unexpected end of input");
  }
  return ret[0];
}

function matchesControlToken(token: Token, ...controls: string[]): token is ControlToken {
  return token instanceof ControlToken && controls.includes(token.control);
}

function matchesOperatorToken(token: Token, ...operators: string[]): token is OperatorToken {
  return token instanceof OperatorToken && operators.includes(token.operator);
}

function parseExpr(tokens: Token[]): [OrExpr | TernaryExpr, Token[]] | undefined {
  let retCond = parseConditionalOr(tokens);
  if (retCond === undefined) {
    return undefined;
  }
  tokens = retCond[1];
  if (matchesControlToken(tokens[0], "?")) {
    tokens = tokens.slice(1);
    let retThen = parseConditionalOr(tokens);
    if (retThen === undefined) {
      return undefined;
    }
    tokens = retThen[1];
    if (!matchesControlToken(tokens[0], ":")) {
      return undefined;
    }
    tokens = tokens.slice(1);
    const retEls = parseExpr(tokens);
    if (retEls === undefined) {
      return undefined;
    }
    tokens = retEls[1];
    return [new TernaryExpr(retCond[0], retThen[0], retEls[0]), tokens];
  }
  return [retCond[0], tokens];
}

function parseConditionalOr(tokens: Token[]): [OrExpr, Token[]] | undefined {
  const exprs: AndExpr[] = [];
  const ret = parseConditionalAnd(tokens);
  if (ret === undefined) {
    return undefined;
  }
  exprs.push(ret[0]);
  tokens = ret[1];
  while (matchesOperatorToken(tokens[0], "||")) {
    tokens = tokens.slice(1);
    const retExpr = parseConditionalAnd(tokens);
    if (retExpr === undefined) {
      return undefined;
    }
    exprs.push(retExpr[0]);
    tokens = retExpr[1];
  }
  return [new OrExpr(exprs), tokens];
}

function parseConditionalAnd(tokens: Token[]): [AndExpr, Token[]] | undefined {
  const exprs: RelExpr[] = [];
  const ret = parseRelation(tokens);
  if (ret === undefined) {
    return undefined;
  }
  exprs.push(ret[0]);
  tokens = ret[1];
  while (matchesOperatorToken(tokens[0], "&&")) {
    tokens = tokens.slice(1);
    const retExpr = parseRelation(tokens);
    if (retExpr === undefined) {
      return undefined;
    }
    exprs.push(retExpr[0]);
    tokens = retExpr[1];
  }
  return [new AndExpr(exprs), tokens];
}
function parseRelation(tokens: Token[]): [RelExpr, Token[]] | undefined {
  const exprs: AddExpr[] = [];
  const operators: string[] = [];
  const ret = parseAddition(tokens);
  if (ret === undefined) {
    return undefined;
  }
  exprs.push(ret[0]);
  tokens = ret[1];
  if (matchesOperatorToken(tokens[0], "<", "<=", ">=", ">", "==", "!=", "in")) {
    operators.push(tokens[0].operator);
    tokens = tokens.slice(1);
    const ret = parseAddition(tokens);
    if (ret === undefined) {
      return undefined;
    }
    exprs.push(ret[0]);
    tokens = ret[1];
  }
  return [new RelExpr(exprs, operators), tokens];
}

function parseAddition(tokens: Token[]): [AddExpr, Token[]] | undefined {
  const exprs: MultExpr[] = [];
  const operators: string[] = [];
  const ret = parseMultiplication(tokens);
  if (ret === undefined) {
    return undefined;
  }
  exprs.push(ret[0]);
  tokens = ret[1];
  while (matchesOperatorToken(tokens[0], "+", "-")) {
    operators.push(tokens[0].operator);
    tokens = tokens.slice(1);
    const ret = parseMultiplication(tokens);
    if (ret === undefined) {
      return undefined;
    }
    exprs.push(ret[0]);
    tokens = ret[1];
  }
  return [new AddExpr(exprs, operators), tokens];
}

function parseMultiplication(tokens: Token[]): [MultExpr, Token[]] | undefined {
  const exprs: UnaryExpr[] = [];
  const operators: string[] = [];
  const ret = parseUnary(tokens);
  if (ret === undefined) {
    return undefined;
  }
  exprs.push(ret[0]);
  tokens = ret[1];
  while (matchesOperatorToken(tokens[0], "*", "/", "%")) {
    operators.push(tokens[0].operator);
    tokens = tokens.slice(1);
    const ret = parseUnary(tokens);
    if (ret === undefined) {
      return undefined;
    }
    exprs.push(ret[0]);
    tokens = ret[1];
  }
  return [new MultExpr(exprs, operators), tokens];
}

function parseUnary(tokens: Token[]): [UnaryExpr, Token[]] | undefined {
  const operators: string[] = [];
  if (matchesOperatorToken(tokens[0], "!", "-")) {
    const firstOperator = tokens[0];
    while (matchesOperatorToken(tokens[0], firstOperator.operator)) {
      operators.push(tokens[0].operator);
      tokens = tokens.slice(1);
    }
  }
  const ret = parseMember(tokens);
  if (ret === undefined) {
    return undefined;
  }
  const unary = ret[0];
  tokens = ret[1];
  return [new UnaryExpr(unary, operators), tokens];
}

function newIdentExpr(name: string): Expr {
  // TODO: Find a better way to handle method call syntax
  const addExpr = new AddExpr([new MultExpr([new UnaryExpr(new Ident(name), [])], [])], []);
  const orExpr = new OrExpr([new AndExpr([new RelExpr([addExpr], [])])]);
  return orExpr;
}

function parseMember(tokens: Token[]): [Member, Token[]] | undefined {
  const retPrimary = parsePrimary(tokens);
  if (retPrimary !== undefined) {
    return retPrimary;
  }
  const retMember = parseMember(tokens);
  if (retMember === undefined) {
    return undefined;
  }
  const member = retMember[0];
  tokens = retMember[1];
  if (matchesControlToken(tokens[0], ".", "(")) {
    let method;
    if (matchesControlToken(tokens[0], ".")) {
      tokens = tokens.slice(1);
      if (!(tokens[0] instanceof IdentToken)) {
        return undefined;
      }
      method = tokens[0].ident;
      tokens = tokens.slice(1);
    }
    if (!matchesControlToken(tokens[0], "(")) {
      return undefined;
    }
    tokens = tokens.slice(1);
    const retExprList = parseExprList(tokens);
    if (retExprList === undefined) {
      return undefined;
    }
    const exprList = retExprList[0];
    if (method !== undefined) {
      exprList.unshift(newIdentExpr(method));
    }
    tokens = retExprList[1];
    if (!matchesControlToken(tokens[0], ")")) {
      return undefined;
    }
    tokens = tokens.slice(1);
    return [new FuncCallExpr(member, exprList), tokens];
  }
  if (matchesControlToken(tokens[0], "[")) {
    tokens = tokens.slice(1);
    const retExpr = parseExpr(tokens);
    if (retExpr === undefined) {
      return undefined;
    }
    const expr = retExpr[0];
    tokens = retExpr[1];
    if (!matchesControlToken(tokens[0], "]")) {
      return undefined;
    }
    tokens = tokens.slice(1);
    return [new IndexExpr(member, expr), tokens];
  }
  return [member, tokens];
}

function parsePrimary(tokens: Token[]): [Primary, Token[]] | undefined {
  const retLiteral = parseLiteral(tokens);
  if (retLiteral !== undefined) {
    return retLiteral;
  }
  if (tokens[0] instanceof IdentToken) {
    const ident = tokens[0].ident;
    tokens = tokens.slice(1);
    return [new Ident(ident), tokens];
  }
  if (matchesControlToken(tokens[0], "(")) {
    tokens = tokens.slice(1);
    const retExpr = parseExpr(tokens);
    if (retExpr === undefined) {
      return undefined;
    }
    const expr = retExpr[0];
    tokens = retExpr[1];
    if (!matchesControlToken(tokens[0], ")")) {
      return undefined;
    }
    tokens = tokens.slice(1);
    return [expr, tokens];
  }
  if (matchesControlToken(tokens[0], "[")) {
    tokens = tokens.slice(1);
    const retExprList = parseExprList(tokens);
    if (retExprList === undefined) {
      return undefined;
    }
    const exprList = retExprList[0];
    tokens = retExprList[1];
    if (matchesControlToken(tokens[0], ",")) {
      tokens = tokens.slice(1);
    }
    if (!matchesControlToken(tokens[0], "]")) {
      return undefined;
    }
    tokens = tokens.slice(1);
    return [new ListExpr(exprList), tokens];
  }
  if (matchesControlToken(tokens[0], "{")) {
    tokens = tokens.slice(1);
    const retMapInits = parseMapInits(tokens);
    if (retMapInits === undefined) {
      return undefined;
    }
    const mapInits = retMapInits[0];
    tokens = retMapInits[1];
    if (matchesControlToken(tokens[0], ",")) {
      tokens = tokens.slice(1);
    }
    if (!matchesControlToken(tokens[0], "}")) {
      return undefined;
    }
    tokens = tokens.slice(1);
    return [new MapExpr(mapInits), tokens];
  }
  return undefined;
}

function parseLiteral(tokens: Token[]): [Literal, Token[]] | undefined {
  if (tokens[0] instanceof IntLitToken) {
    const value = tokens[0].value;
    tokens = tokens.slice(1);
    return [new IntLit(value), tokens];
  }
  if (tokens[0] instanceof UintLitToken) {
    const value = tokens[0].value;
    tokens = tokens.slice(1);
    return [new UintLit(value), tokens];
  }
  if (tokens[0] instanceof FloatLitToken) {
    const value = tokens[0].value;
    tokens = tokens.slice(1);
    return [new FloatLit(value), tokens];
  }
  if (tokens[0] instanceof StringLitToken) {
    const value = tokens[0].value;
    tokens = tokens.slice(1);
    return [new StringLit(value), tokens];
  }
  if (tokens[0] instanceof ByteLitToken) {
    const value = tokens[0].value;
    tokens = tokens.slice(1);
    return [new ByteLit(value), tokens];
  }
  if (tokens[0] instanceof BoolLitToken) {
    const value = tokens[0].value;
    tokens = tokens.slice(1);
    return [new BoolLit(value), tokens];
  }
  if (tokens[0] instanceof NullLitToken) {
    const value = tokens[0].value;
    tokens = tokens.slice(1);
    return [new NullLit(value), tokens];
  }
  return undefined;
}

function parseExprList(tokens: Token[]): [Expr[], Token[]] | undefined {
  const exprs: Expr[] = [];
  while (matchesControlToken(tokens[0], ",")) {
    tokens = tokens.slice(1);
    const ret = parseExpr(tokens);
    if (ret === undefined) {
      return undefined;
    }
    exprs.push(ret[0]);
    tokens = ret[1];
  }
  if (exprs.length === 0) {
    return undefined;
  }
  return [exprs, tokens];
}

function parseMapInits(tokens: Token[]): [[Expr, Expr][], Token[]] | undefined {
  const mapInits: [Expr, Expr][] = [];
  while (matchesControlToken(tokens[0], ",")) {
    tokens = tokens.slice(1);
    const retKey = parseExpr(tokens);
    if (retKey === undefined) {
      return undefined;
    }
    const key = retKey[0];
    tokens = retKey[1];
    if (!matchesControlToken(tokens[0], ":")) {
      return undefined;
    }
    tokens = tokens.slice(1);
    const retValue = parseExpr(tokens);
    if (retValue === undefined) {
      return undefined;
    }
    const value = retValue[0];
    tokens = retValue[1];
    mapInits.push([key, value]);
  }
  if (mapInits.length === 0) {
    return undefined;
  }
  return [mapInits, tokens];
}

function testParser() {
  const input = `!!(myNum == 123 && (myStr == "hello" || myBool == true) ? myNum + 1 == 2 : -myNum - 1 == 10)`;
  const lexed = lexer(input);
  const parsed = parser(lexed);
  console.log(parsed);
}

testParser();
