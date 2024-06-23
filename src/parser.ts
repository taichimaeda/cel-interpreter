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

type NodeType =
  | "INT"
  | "UINT"
  | "DOUBLE"
  | "BOOL"
  | "STRING"
  | "BYTES"
  | "LIST"
  | "MAP"
  | "NULL"
  | "MESSAGE"
  | "TYPE";

type Expr = OrExpr | TernaryExpr;

class TernaryExpr {
  constructor(
    public readonly cond: OrExpr,
    public readonly then?: OrExpr,
    public readonly els?: Expr
  ) {}
}

class OrExpr {
  constructor(public readonly exprs: AndExpr[]) {}
}

class AndExpr {
  constructor(public readonly exprs: RelExpr[]) {}
}

class RelExpr {
  constructor(
    public readonly exprs: AddExpr[],
    public readonly ops?: "<" | "<=" | ">=" | ">" | "==" | "!=" | "in"[]
  ) {}
}

class AddExpr {
  constructor(
    public readonly exprs: MultExpr[],
    public readonly ops?: ("+" | "-")[]
  ) {}
}

class MultExpr {
  constructor(
    public readonly exprs: UnaryExpr[],
    public readonly ops?: ("*" | "/" | "%")[]
  ) {}
}

class UnaryExpr {
  constructor(
    public readonly member: Member,
    public readonly ops?: "!"[] | "-"[]
  ) {}
}

type Member = Primary | MemberSelection | MemberIndexing;

type Primary = Literal | Ident | Expr | ArrayLit | MapLit | FieldInit;

class Literal {
  constructor(public readonly value: string | number | boolean | null) {}
}

class Ident {
  constructor(public readonly ident: string) {}
}

class ArrayLit {
  constructor(public readonly exprs: Expr[]) {}
}

class MapLit {
  constructor(public readonly exprs: Record<PropertyKey, Expr>) {}
}

class FieldInit {
  constructor(public readonly exprs: Record<string, Expr>) {}
}

class MemberSelection {
  constructor(public readonly member: Member, public readonly ident: string) {}
}

class MemberIndexing {
  constructor(public readonly member: Member, public readonly index: Expr) {}
}
