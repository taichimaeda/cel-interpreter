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
*/

/*
NOTE:
Member  ::= Primary
        | Member [["." IDENT] "(" [ExprList] ")"]
        | Member "[" Expr "]"
        ;
Primary ::= IDENT 
        | LITERAL
        | "(" Expr ")"
        | "[" [ExprList] [","] "]"
        | "{" [MapInits] [","] "}" 
        ;
*/

type Expr = OrExpr | TernaryExpr;

class TernaryExpr {
  constructor(public readonly cond: OrExpr, public readonly then?: OrExpr, public readonly els?: Expr) {}
}

class OrExpr {
  constructor(public readonly exprs: AndExpr[]) {}
}

class AndExpr {
  constructor(public readonly exprs: RelExpr[]) {}
}

class RelExpr {
  constructor(public readonly exprs: AddExpr[], public readonly ops: string[]) {}
}

class AddExpr {
  constructor(public readonly exprs: MultExpr[], public readonly ops: string[]) {}
}

class MultExpr {
  constructor(public readonly exprs: UnaryExpr[], public readonly ops: string[]) {}
}

class UnaryExpr {
  constructor(public readonly member: Member, public readonly ops: string[]) {}
}

type Member = Primary | FunctionCallExpr | IndexingExpr;

type Primary = Literal | Ident | Expr | ArrayLit | MapLit;

class Literal {
  constructor(public readonly value: string | number | boolean | null) {}
}

class Ident {
  constructor(public readonly name: string) {}
}

class ArrayLit {
  constructor(public readonly exprs: Expr[]) {}
}

class MapLit {
  constructor(public readonly exprs: [Expr, Expr][]) {}
}

class IndexingExpr {
  constructor(public readonly member: Member, public readonly index: Expr) {}
}

class FunctionCallExpr {
  constructor(public readonly member: Member, public readonly exprs: Expr[]) {}
}

function parser(tokens: Token[]): Expr {
  // TODO: Implement
  return new OrExpr([]);
}

function parseExpr(tokens: Token[]): [OrExpr | TernaryExpr, Token[]] | undefined {
  let parsedCond = parseConditionalOr(tokens);
  if (parsedCond === undefined) {
    return undefined;
  }
  tokens = parsedCond[1];
  if (tokens[0] instanceof OperatorToken && tokens[0].operator === "?") {
    tokens = tokens.slice(1);
    let parsedThen = parseConditionalOr(tokens);
    if (parsedThen === undefined) {
      return undefined;
    }
    tokens = parsedThen[1];
    if (!(tokens[0] instanceof OperatorToken && tokens[0].operator === ":")) {
      return undefined;
    }
    tokens = tokens.slice(1);
    const parsedEls = parseExpr(tokens);
    if (parsedEls === undefined) {
      return undefined;
    }
    tokens = parsedEls[1];
    return [new TernaryExpr(parsedCond[0], parsedThen[0], parsedEls[0]), tokens];
  }
  return [parsedCond[0], tokens];
}

function parseConditionalOr(tokens: Token[]): [OrExpr, Token[]] | undefined {
  const exprs: AndExpr[] = [];
  const parsed = parseConditionalAnd(tokens);
  if (parsed === undefined) {
    return undefined;
  }
  exprs.push(parsed[0]);
  tokens = parsed[1];
  while (tokens[0] instanceof OperatorToken && tokens[0].operator === "||") {
    tokens = tokens.slice(1);
    const parsedExpr = parseConditionalAnd(tokens);
    if (parsedExpr === undefined) {
      return undefined;
    }
    exprs.push(parsedExpr[0]);
    tokens = parsedExpr[1];
  }
  return [new OrExpr(exprs), tokens];
}

function parseConditionalAnd(tokens: Token[]): [AndExpr, Token[]] | undefined {
  const exprs: RelExpr[] = [];
  const parsed = parseRelation(tokens);
  if (parsed === undefined) {
    return undefined;
  }
  exprs.push(parsed[0]);
  tokens = parsed[1];
  while (tokens[0] instanceof OperatorToken && tokens[0].operator === "&&") {
    tokens = tokens.slice(1);
    const parsedExpr = parseRelation(tokens);
    if (parsedExpr === undefined) {
      return undefined;
    }
    exprs.push(parsedExpr[0]);
    tokens = parsedExpr[1];
  }
  return [new AndExpr(exprs), tokens];
}
function parseRelation(tokens: Token[]): [RelExpr, Token[]] | undefined {
  const exprs: AddExpr[] = [];
  const operators: string[] = [];
  const parsed = parseAddition(tokens);
  if (parsed === undefined) {
    return undefined;
  }
  exprs.push(parsed[0]);
  tokens = parsed[1];
  if (tokens[0] instanceof OperatorToken && ["<", "<=", ">=", ">", "==", "!=", "in"].includes(tokens[0].operator)) {
    operators.push(tokens[0].operator);
    tokens = tokens.slice(1);
    const parsed = parseAddition(tokens);
    if (parsed === undefined) {
      return undefined;
    }
    exprs.push(parsed[0]);
    tokens = parsed[1];
  }
  return [new RelExpr(exprs, operators), tokens];
}

function parseAddition(tokens: Token[]): [AddExpr, Token[]] | undefined {
  const exprs: MultExpr[] = [];
  const operators: string[] = [];
  const parsed = parseMultiplication(tokens);
  if (parsed === undefined) {
    return undefined;
  }
  exprs.push(parsed[0]);
  tokens = parsed[1];
  while (tokens[0] instanceof OperatorToken && ["+", "-"].includes(tokens[0].operator)) {
    operators.push(tokens[0].operator);
    tokens = tokens.slice(1);
    const parsed = parseMultiplication(tokens);
    if (parsed === undefined) {
      return undefined;
    }
    exprs.push(parsed[0]);
    tokens = parsed[1];
  }
  return [new AddExpr(exprs, operators), tokens];
}

function parseMultiplication(tokens: Token[]): [MultExpr, Token[]] | undefined {
  const exprs: UnaryExpr[] = [];
  const operators: string[] = [];
  const parsed = parseUnary(tokens);
  if (parsed === undefined) {
    return undefined;
  }
  exprs.push(parsed[0]);
  tokens = parsed[1];
  while (tokens[0] instanceof OperatorToken && ["*", "/", "%"].includes(tokens[0].operator)) {
    operators.push(tokens[0].operator);
    tokens = tokens.slice(1);
    const parsed = parseUnary(tokens);
    if (parsed === undefined) {
      return undefined;
    }
    exprs.push(parsed[0]);
    tokens = parsed[1];
  }
  return [new MultExpr(exprs, operators), tokens];
}

function parseUnary(tokens: Token[]): [UnaryExpr, Token[]] | undefined {
  const operators: string[] = [];
  if (tokens[0] instanceof OperatorToken && ["!", "-"].includes(tokens[0].operator)) {
    const firstOperator = tokens[0];
    operators.push(tokens[0].operator);
    while (tokens[0] instanceof OperatorToken && tokens[0].operator === firstOperator.operator) {
      operators.push(tokens[0].operator);
      tokens = tokens.slice(1);
    }
  }
  const parsed = parseMember(tokens);
  if (parsed === undefined) {
    return undefined;
  }
  const unary = parsed[0];
  tokens = parsed[1];
  return [new UnaryExpr(unary, operators), tokens];
}

function parseMember(tokens: Token[]): [Member, Token[]] | undefined {
  const parsedPrimary = parsePrimary(tokens);
  if (parsedPrimary !== undefined) {
    return parsedPrimary;
  }
  const parsedMember = parseMember(tokens);
  if (parsedMember === undefined) {
    return undefined;
  }
  const member = parsedMember[0];
  tokens = parsedMember[1];
  if (tokens[0] === "." || tokens[0] === "(") {
    let method;
    if (tokens[0] === ".") {
      tokens = tokens.slice(1);
      if (!(tokens[0] instanceof IdentToken)) {
        return undefined;
      }
      method = tokens[0].ident;
      tokens = tokens.slice(1);
    }
    if (tokens[0] !== "(") {
      return undefined;
    }
    tokens = tokens.slice(1);
    const parsedExprList = parseExprList(tokens);
    if (parsedExprList === undefined) {
      return undefined;
    }
    const exprList = parsedExprList[0];
    if (method !== undefined) {
      exprList.unshift(
        // TODO: Find a better way to handle method call syntax
        // prettier-ignore
        new OrExpr([new AndExpr([new RelExpr([new AddExpr([new MultExpr([new UnaryExpr(new Ident(method), [])], [])], [])], [])])])
      );
    }
    tokens = parsedExprList[1];
    if (tokens[0] !== ")") {
      return undefined;
    }
    tokens = tokens.slice(1);
    return [new FunctionCallExpr(member, exprList), tokens];
  }
  if (tokens[0] === "[") {
    tokens = tokens.slice(1);
    const parsedExpr = parseExpr(tokens);
    if (parsedExpr === undefined) {
      return undefined;
    }
    const expr = parsedExpr[0];
    tokens = parsedExpr[1];
    if (tokens[0] !== "]") {
      return undefined;
    }
    tokens = tokens.slice(1);
    return [new IndexingExpr(member, expr), tokens];
  }
  return [member, tokens];
}

function parsePrimary(tokens: Token[]): [Primary, Token[]] | undefined {
  if (tokens[0] instanceof IdentToken) {
    const ident = tokens[0].ident;
    tokens = tokens.slice(1);
    return [new Ident(ident), tokens];
  }
  if (
    tokens[0] instanceof IntLitToken ||
    tokens[0] instanceof UintLitToken ||
    tokens[0] instanceof FloatLitToken ||
    tokens[0] instanceof StringLitToken ||
    tokens[0] instanceof ByteLitToken ||
    tokens[0] instanceof BoolLitToken ||
    tokens[0] instanceof NullLitToken
  ) {
    const value = tokens[0].value;
    tokens = tokens.slice(1);
    return [new Literal(value), tokens];
  }
  if (tokens[0] === "(") {
    tokens = tokens.slice(1);
    const parsedExpr = parseExpr(tokens);
    if (parsedExpr === undefined) {
      return undefined;
    }
    const expr = parsedExpr[0];
    tokens = parsedExpr[1];
    if (tokens[0] !== ")") {
      return undefined;
    }
    tokens = tokens.slice(1);
    return [expr, tokens];
  }
  if (tokens[0] === "[") {
    tokens = tokens.slice(1);
    const parsedExprList = parseExprList(tokens);
    if (parsedExprList === undefined) {
      return undefined;
    }
    const exprList = parsedExprList[0];
    tokens = parsedExprList[1];
    if (tokens[0] === ",") {
      tokens = tokens.slice(1);
    }
    if (tokens[0] !== "]") {
      return undefined;
    }
    tokens = tokens.slice(1);
    return [new ArrayLit(exprList), tokens];
  }
  if (tokens[0] === "{") {
    tokens = tokens.slice(1);
    const parsedMapInits = parseMapInits(tokens);
    if (parsedMapInits === undefined) {
      return undefined;
    }
    const mapInits = parsedMapInits[0];
    tokens = parsedMapInits[1];
    if (tokens[0] === ",") {
      tokens = tokens.slice(1);
    }
    if (tokens[0] !== "}") {
      return undefined;
    }
    tokens = tokens.slice(1);
    return [new MapLit(mapInits), tokens];
  }
  return undefined;
}

function parseExprList(tokens: Token[]): [Expr[], Token[]] | undefined {
  const exprs: Expr[] = [];
  while (tokens[0] === ",") {
    tokens = tokens.slice(1);
    const parsed = parseExpr(tokens);
    if (parsed === undefined) {
      return undefined;
    }
    exprs.push(parsed[0]);
    tokens = parsed[1];
  }
  if (exprs.length === 0) {
    return undefined;
  }
  return [exprs, tokens];
}

function parseMapInits(tokens: Token[]): [[Expr, Expr][], Token[]] | undefined {
  const mapInits: [Expr, Expr][] = [];
  while (tokens[0] === ",") {
    tokens = tokens.slice(1);
    const parsedKey = parseExpr(tokens);
    if (parsedKey === undefined) {
      return undefined;
    }
    const key = parsedKey[0];
    tokens = parsedKey[1];
    if (tokens[0] !== ":") {
      return undefined;
    }
    tokens = tokens.slice(1);
    const parsedValue = parseExpr(tokens);
    if (parsedValue === undefined) {
      return undefined;
    }
    const value = parsedValue[0];
    tokens = parsedValue[1];
    mapInits.push([key, value]);
  }
  if (mapInits.length === 0) {
    return undefined;
  }
  return [mapInits, tokens];
}
