/*
List of standard definitions
https://github.com/google/cel-spec/blob/master/doc/langdef.md#list-of-standard-definitions
*/

type Activation = Record<string, Value>;

type Value = IntValue | UintValue | FloatValue | StringValue | ByteValue | BoolValue | NullValue | ListValue | MapValue;

class IntValue {
  constructor(public readonly value: number) {}
}

class UintValue {
  constructor(public readonly value: number) {}
}

class FloatValue {
  constructor(public readonly value: number) {}
}

class StringValue {
  constructor(public readonly value: string) {}
}

class ByteValue {
  constructor(public readonly value: string) {}
}

class BoolValue {
  constructor(public readonly value: boolean) {}
}

class NullValue {
  constructor(public readonly value: null = null) {}
}

class ListValue {
  constructor(public readonly values: any[]) {}
}

class MapValue {
  constructor(public readonly values: Record<any, any>[]) {}
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

function listValuesEqual(left: ListValue, right: ListValue): boolean {
  return (
    left.values.length === right.values.length &&
    left.values.every((_, i) => {
      if (left.values[i] instanceof ListValue && right.values[i] instanceof ListValue) {
        return listValuesEqual(left.values[i], right.values[i]);
      }
      if (left.values[i] instanceof MapValue && right.values[i] instanceof MapValue) {
        return mapValuesEqual(left.values[i], right.values[i]);
      }
      return left.values[i] === right.values[i];
    })
  );
}

function mapValuesEqual(left: MapValue, right: MapValue): boolean {
  const leftKeys = Object.keys(left.values).sort();
  const rightKeys = Object.keys(right.values).sort();
  if (leftKeys.length !== rightKeys.length || !leftKeys.every((_, i) => leftKeys[i] === rightKeys[i])) {
    return false;
  }
  return leftKeys.every((key) => {
    if (left.values[key] instanceof ListValue && right.values[key] instanceof ListValue) {
      return listValuesEqual(left.values[key], right.values[key]);
    }
    return left.values[key] === right.values[key];
  });
}

function evalRelExpr(relExpr: RelExpr, activation: Activation): Value {
  const exprs = relExpr.exprs.map((expr) => evalAddExpr(expr, activation));
  const ops = relExpr.ops;
  if (ops.length === 1) {
    return exprs[0];
  }
  // TODO: Handle in operator
  if (
    exprs.every((expr) => expr instanceof IntValue || expr instanceof UintValue || expr instanceof FloatValue) ||
    exprs.every((expr) => expr instanceof StringValue) ||
    exprs.every((expr) => expr instanceof ByteValue) ||
    exprs.every((expr) => expr instanceof BoolValue)
  ) {
    const value = ops.reduce((acc, op, i) => {
      const left = exprs[i].value;
      const right = exprs[i + 1].value;
      switch (op) {
        case "==":
          return acc && left === right;
        case "!=":
          return acc && left !== right;
        case "<":
          return acc && left < right;
        case "<=":
          return acc && left <= right;
        case ">":
          return acc && left > right;
        case ">=":
          return acc && left >= right;
        default:
          throw new Error(`Unexpected operator ${op}`);
      }
    }, true);
    return new BoolValue(value);
  }
  if (exprs.every((expr) => expr instanceof ListValue)) {
    const value = ops.reduce((acc, op, i) => {
      const left = exprs[i];
      const right = exprs[i + 1];
      switch (op) {
        case "==":
          return acc && listValuesEqual(left, right);
        default:
          throw new Error(`Unexpected operator ${op}`);
      }
    }, true);
    return new BoolValue(value);
  }
  if (exprs.every((expr) => expr instanceof MapValue)) {
    const value = ops.reduce((acc, op, i) => {
      const left = exprs[i];
      const right = exprs[i + 1];
      switch (op) {
        case "==":
          return acc && mapValuesEqual(left, right);
        default:
          throw new Error(`Unexpected operator ${op}`);
      }
    }, true);
    return new BoolValue(value);
  }
  throw new Error(`Unexpected operands ${exprs}`);
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
    return new ListValue(exprs.flatMap((expr) => expr.values));
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
    return member.values[index.value];
  }
  if (member instanceof MapValue) {
    if (!(index instanceof StringValue || index instanceof IntValue || index instanceof UintValue)) {
      throw new Error(`Unexpected index ${index}`);
    }
    return member.values[index.value];
  }
  throw new Error(`Unexpected member ${member}`);
}

function evalFuncCallExpr(funcCallExpr: FuncCallExpr, activation: Activation): Value {
  const member = funcCallExpr.member;
  if (!(member instanceof Ident)) {
    throw new Error(`Unexpected member ${member}`);
  }
  const func = BUILTINS[member.name];
  if (func === undefined) {
    throw new Error(`Unexpected function ${member.name}`);
  }
  return func(...funcCallExpr.exprs.map((expr) => evalExpr(expr, activation)));
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
