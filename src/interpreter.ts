/*
List of standard definitions
https://github.com/google/cel-spec/blob/master/doc/langdef.md#list-of-standard-definitions
*/
import { builtin } from "./builtin";
import { lexer } from "./lexer";
import {
  AddExpr,
  AndExpr,
  BoolLit,
  ByteLit,
  Expr,
  FloatLit,
  FuncCallExpr,
  Ident,
  IndexExpr,
  IntLit,
  ListExpr,
  MapExpr,
  Member,
  MultExpr,
  NullLit,
  OrExpr,
  parser,
  Primary,
  RelExpr,
  StringLit,
  TernaryExpr,
  UintLit,
  UnaryExpr,
} from "./parser";

export type Activation = Record<string, Value>;

export type Value =
  | IntValue
  | UintValue
  | FloatValue
  | StringValue
  | ByteValue
  | BoolValue
  | NullValue
  | ListValue
  | MapValue;

export class IntValue {
  constructor(public readonly value: number) {}
}

export class UintValue {
  constructor(public readonly value: number) {}
}

export class FloatValue {
  constructor(public readonly value: number) {}
}

export class StringValue {
  constructor(public readonly value: string) {}
}

export class ByteValue {
  constructor(public readonly value: string) {}
}

export class BoolValue {
  constructor(public readonly value: boolean) {}
}

export class NullValue {
  constructor(public readonly value: null = null) {}
}

export class ListValue {
  constructor(public readonly value: any[]) {}
}

export class MapValue {
  constructor(public readonly value: Record<any, any>) {}
}

function interpreter(expr: Expr, activation: Activation): any {
  return evalExpr(expr, activation);
}

function evalExpr(expr: Expr, activation: Activation): any {
  if (expr instanceof TernaryExpr) {
    return evalTernaryExpr(expr, activation);
  } else {
    return evalOrExpr(expr, activation);
  }
}

function evalTernaryExpr(ternaryExpr: TernaryExpr, activation: Activation): Value {
  const cond = evalOrExpr(ternaryExpr.cond, activation);
  if (cond) {
    return evalOrExpr(ternaryExpr.then!, activation);
  } else {
    return evalExpr(ternaryExpr.els!, activation);
  }
}

function evalOrExpr(orExpr: OrExpr, activation: Activation): Value {
  const exprs = orExpr.exprs.map((expr) => evalAndExpr(expr, activation));
  if (exprs.length === 1) {
    return exprs[0];
  }
  if (!exprs.every((expr) => expr instanceof BoolValue)) {
    throw new Error(`Unexpected operands ${exprs}`);
  }
  return new BoolValue(exprs.some((expr) => expr.value));
}

function evalAndExpr(andExpr: AndExpr, activation: Activation): Value {
  const exprs = andExpr.exprs.map((expr) => evalRelExpr(expr, activation));
  if (exprs.length === 1) {
    return exprs[0];
  }
  if (!exprs.every((expr) => expr instanceof BoolValue)) {
    throw new Error(`Unexpected operands ${exprs}`);
  }
  return new BoolValue(exprs.every((expr) => expr.value));
}

function valuesEqual(left: Value, right: Value): boolean {
  if (left instanceof ListValue && right instanceof ListValue) {
    return listValuesEqual(left, right);
  }
  if (left instanceof MapValue && right instanceof MapValue) {
    return mapValuesEqual(left, right);
  }
  return left.value === right.value;
}

function listValuesEqual(left: ListValue, right: ListValue): boolean {
  return (
    left.value.length === right.value.length &&
    left.value.every((_, i) => {
      if (left.value[i] instanceof ListValue && right.value[i] instanceof ListValue) {
        return listValuesEqual(left.value[i], right.value[i]);
      }
      if (left.value[i] instanceof MapValue && right.value[i] instanceof MapValue) {
        return mapValuesEqual(left.value[i], right.value[i]);
      }
      return left.value[i] === right.value[i];
    })
  );
}

function mapValuesEqual(left: MapValue, right: MapValue): boolean {
  const leftKeys = Object.keys(left.value).sort();
  const rightKeys = Object.keys(right.value).sort();
  if (leftKeys.length !== rightKeys.length || !leftKeys.every((_, i) => leftKeys[i] === rightKeys[i])) {
    return false;
  }
  return leftKeys.every((key) => {
    if (left.value[key] instanceof ListValue && right.value[key] instanceof ListValue) {
      return listValuesEqual(left.value[key], right.value[key]);
    }
    return left.value[key] === right.value[key];
  });
}

function valuesLessThan(left: Value, right: Value): boolean {
  if (left instanceof ListValue || right instanceof ListValue) {
    throw new Error("List comparison is not implemented");
  }
  if (left instanceof MapValue || right instanceof MapValue) {
    throw new Error("Map comparison is not implemented");
  }
  return left.value < right.value;
}

function valuesLessThanOrEqual(left: Value, right: Value): boolean {
  return valuesLessThan(left, right) || valuesEqual(left, right);
}

function valueInList(left: Value, right: ListValue): boolean {
  return right.value.some((value) => valuesEqual(left, value));
}

function valueInMap(left: Value, right: MapValue): boolean {
  return Object.keys(right.value).some((key) => valuesEqual(left, new StringValue(key)));
}

function evalRelExpr(relExpr: RelExpr, activation: Activation): Value {
  const exprs = relExpr.exprs.map((expr) => evalAddExpr(expr, activation));
  const ops = relExpr.ops;
  if (ops.length === 0) {
    return exprs[0];
  }
  // TODO: Handle in operator
  const value = ops.reduce((acc, op, i) => {
    const left = exprs[i];
    const right = exprs[i + 1];
    switch (op) {
      case "==":
        return acc && valuesEqual(left, right);
      case "!=":
        return acc && !valuesEqual(left, right);
      case "<":
        return acc && valuesLessThan(left, right);
      case "<=":
        return acc && valuesLessThanOrEqual(left, right);
      case ">":
        return acc && !valuesLessThan(left, right);
      case ">=":
        return acc && !valuesLessThanOrEqual(left, right);
      case "in":
        if (right instanceof ListValue) {
          return acc && valueInList(left, right);
        }
        if (right instanceof MapValue) {
          return acc && valueInMap(left, right);
        }
        throw new Error(`Unexpected operand ${right}`);
      default:
        throw new Error(`Unexpected operator ${op}`);
    }
  }, true);
  return new BoolValue(value);
}

function evalAddExpr(addExpr: AddExpr, activation: Activation): Value {
  const exprs = addExpr.exprs.map((expr) => evalMultExpr(expr, activation));
  const ops = addExpr.ops;
  if (ops.length === 0) {
    return exprs[0];
  }
  if (exprs.every((expr) => expr instanceof ListValue)) {
    if (!ops.every((op) => op === "+")) {
      throw new Error(`Unexpected operators ${ops}`);
    }
    return new ListValue(exprs.flatMap((expr) => expr.value));
  }
  if (exprs.every((expr) => expr instanceof StringValue)) {
    if (!ops.every((op) => op === "+")) {
      throw new Error(`Unexpected operators ${ops}`);
    }
    return new StringValue(exprs.map((expr) => expr.value).join(""));
  }
  if (exprs.every((expr) => expr instanceof ByteValue)) {
    if (!ops.every((op) => op === "+")) {
      throw new Error(`Unexpected operators ${ops}`);
    }
    return new ByteValue(exprs.map((expr) => expr.value).join(""));
  }
  if (exprs.every((expr) => expr instanceof IntValue || expr instanceof UintValue || expr instanceof FloatValue)) {
    const value = ops.reduce((acc, op, i) => {
      const left = acc;
      const right = exprs[i].value;
      switch (op) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        default:
          throw new Error(`Unexpected operator ${op}`);
      }
    }, 0);
    if (exprs.some((expr) => expr instanceof FloatValue)) {
      return new FloatValue(value);
    }
    if (exprs.every((expr) => expr instanceof UintValue)) {
      return new UintValue(value);
    }
    return new IntValue(value);
  }
  throw new Error(`Unexpected operands ${exprs}`);
}

function evalMultExpr(multExpr: MultExpr, activation: Activation): Value {
  const exprs = multExpr.exprs.map((expr) => evalUnaryExpr(expr, activation));
  const ops = multExpr.ops;
  if (ops.length === 0) {
    return exprs[0];
  }
  if (exprs.every((expr) => expr instanceof IntValue || expr instanceof UintValue || expr instanceof FloatValue)) {
    const value = ops.reduce((acc, op, i) => {
      const left = acc;
      const right = exprs[i].value;
      switch (op) {
        case "*":
          return left * right;
        case "/":
          return left / right;
        case "%":
          return left % right;
        default:
          throw new Error(`Unexpected operator ${op}`);
      }
    }, 1);
    if (exprs.some((expr) => expr instanceof FloatValue)) {
      return new FloatValue(value);
    }
    if (exprs.every((expr) => expr instanceof UintValue)) {
      return new UintValue(value);
    }
    return new IntValue(value);
  }
  throw new Error(`Unexpected operands ${exprs}`);
}

function evalUnaryExpr(unaryExpr: UnaryExpr, activation: Activation): Value {
  const member = evalMember(unaryExpr.member, activation);
  const ops = unaryExpr.ops;
  if (ops.length === 0) {
    return member;
  }
  if (member instanceof IntValue || member instanceof UintValue) {
    const value = ops.reduce((acc, op) => {
      switch (op) {
        case "-":
          return -acc;
        default:
          throw new Error(`Unexpected operator ${op}`);
      }
    }, member.value);
    return new IntValue(value);
  }
  if (member instanceof FloatValue) {
    const value = ops.reduce((acc, op) => {
      switch (op) {
        case "-":
          return -acc;
        default:
          throw new Error(`Unexpected operator ${op}`);
      }
    }, member.value);
    return new FloatValue(value);
  }
  if (member instanceof BoolValue) {
    const value = ops.reduce((acc, op) => {
      switch (op) {
        case "!":
          return !acc;
        default:
          throw new Error(`Unexpected operator ${op}`);
      }
    }, member.value);
    return new BoolValue(value);
  }
  throw new Error(`Unexpected operators ${ops}`);
}

function evalMember(member: Member, activation: Activation): Value {
  if (member instanceof IndexExpr) {
    return evalIndexExpr(member, activation);
  }
  if (member instanceof FuncCallExpr) {
    return evalFuncCallExpr(member, activation);
  }
  return evalPrimary(member, activation);
}

function evalIndexExpr(indexExpr: IndexExpr, activation: Activation): Value {
  const member = evalMember(indexExpr.member, activation);
  const index = evalExpr(indexExpr.index, activation);
  if (member instanceof ListValue) {
    if (!(index instanceof IntValue || index instanceof UintValue)) {
      throw new Error(`Unexpected index ${index}`);
    }
    return member.value[index.value];
  }
  if (member instanceof MapValue) {
    if (!(index instanceof StringValue || index instanceof IntValue || index instanceof UintValue)) {
      throw new Error(`Unexpected index ${index}`);
    }
    return member.value[index.value];
  }
  throw new Error(`Unexpected member ${member}`);
}

function evalFuncCallExpr(funcCallExpr: FuncCallExpr, activation: Activation): Value {
  const member = funcCallExpr.member;
  if (!(member instanceof Ident)) {
    throw new Error(`Unexpected member ${member}`);
  }
  const method = member.name;
  const args = funcCallExpr.exprs.map((expr) => evalExpr(expr, activation));
  return builtin(method, ...args);
}

function evalPrimary(primary: Primary, activation: Activation): Value {
  if (primary instanceof IntLit) {
    return new IntValue(primary.value);
  }
  if (primary instanceof UintLit) {
    return new UintValue(primary.value);
  }
  if (primary instanceof FloatLit) {
    return new FloatValue(primary.value);
  }
  if (primary instanceof StringLit) {
    return new StringValue(primary.value);
  }
  if (primary instanceof ByteLit) {
    return new ByteValue(primary.value);
  }
  if (primary instanceof BoolLit) {
    return new BoolValue(primary.value);
  }
  if (primary instanceof NullLit) {
    return new NullValue();
  }
  if (primary instanceof Ident) {
    return evalIdent(primary, activation);
  }
  if (primary instanceof ListExpr) {
    return new ListValue(primary.exprs.map((expr) => evalExpr(expr, activation)));
  }
  if (primary instanceof MapExpr) {
    return new MapValue(
      Object.fromEntries(primary.exprs.map(([key, value]) => [evalExpr(key, activation), evalExpr(value, activation)]))
    );
  }
  return evalExpr(primary, activation);
}

function evalIdent(ident: Ident, activation: Activation): Value {
  if (!activation[ident.name]) {
    throw new Error(`Unexpected identifier ${ident.name}`);
  }
  return activation[ident.name];
}

function testInterpreter() {
  const input = `!!(myNum == 123 && (myStr == "hello" || myBool == true) ? myNum + 1 == 2 : -myNum - 1 == 10)`;
  const lexed = lexer(input);
  const parsed = parser(lexed);
  const activation = {
    myNum: new IntValue(13),
    myStr: new StringValue("hello"),
    myBool: new BoolValue(true),
  };
  const result1 = interpreter(parsed, activation);
  console.log(result1);

  const myNum = 13 as number;
  const myStr = "hello";
  const myBool = true;
  const result2 = !!(myNum == 123 && (myStr == "hello" || myBool == true) ? myNum + 1 == 2 : -myNum - 1 == 10);
  console.log(result2);
}

testInterpreter();
