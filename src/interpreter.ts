/*
List of standard definitions
https://github.com/google/cel-spec/blob/master/doc/langdef.md#list-of-standard-definitions
*/

type Type = "INT" | "UINT" | "DOUBLE" | "BOOL" | "STRING" | "BYTES" | "LIST" | "MAP" | "NULL" | "MESSAGE" | "TYPE";

type Value = number | string | boolean | null | unknown[] | Record<string, unknown>;

type Activation = Record<string, Value>;

function eval(expr: Expr, activation: Activation): any {
  return null;
}

function evalExpr(expr: Expr, activation: Activation): Value {
  if (expr instanceof TernaryExpr) {
    return evalTernaryExpr(expr, activation);
  } else {
    return evalOrExpr(expr, activation);
  }
}

function evalTernaryExpr(ternaryExpr: TernaryExpr, activation: Activation): Value {
  const cond = evalOrExpr(ternaryExpr.cond, activation);
  if (cond) {
    return evalOrExpr(ternaryExpr.then, activation);
  } else {
    return evalExpr(ternaryExpr.els, activation);
  }
}

function evalOrExpr(orExpr: OrExpr, activation: Activation): Value {
  return orExpr.exprs.some((expr) => evalAndExpr(expr, activation));
}

function evalAndExpr(andExpr: AndExpr, activation: Activation): Value {
  return andExpr.exprs.every((expr) => evalRelExpr(expr, activation));
}

function evalRelExpr(relExpr: RelExpr, activation: Activation): Value {
  const exprs = relExpr.exprs.map((expr) => evalAddExpr(expr, activation));
  if (relExpr.ops.length > 0) {
    return relExpr.ops.every((op, i) => {
      const left = exprs[i];
      const right = exprs[i + 1];
      switch (op) {
        case "==":
          return left === right;
        case "!=":
          return left !== right;
        case "<":
          return left < right;
        case "<=":
          return left <= right;
        case ">":
          return left > right;
        case ">=":
          return left >= right;
        default:
          throw new Error(`Unexpected operator ${op}`);
      }
    });
  }
  return exprs[0];
}

function evalAddExpr(addExpr: AddExpr, activation: Activation): Value {
  const exprs = addExpr.exprs.map((expr) => evalMultExpr(expr, activation));
  if (addExpr.ops.length > 0) {
    return addExpr.ops.reduce((acc, op, i) => {
      const left = acc;
      const right = exprs[i];
      switch (op) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        default:
          throw new Error(`Unexpected operator ${op}`);
      }
    }, 0);
  }
  return exprs[0];
}

function evalMultExpr(multExpr: MultExpr, activation: Activation): Value {
  const exprs = multExpr.exprs.map((expr) => evalUnaryExpr(expr, activation));
  if (multExpr.ops.length > 0) {
    return multExpr.ops.reduce((acc, op, i) => {
      const left = acc;
      const right = exprs[i];
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
  }
  return exprs[0];
}

function evalUnaryExpr(unaryExpr: UnaryExpr, activation: Activation): Value {
  const member = evalMember(unaryExpr.member, activation);
  if (unaryExpr.ops.length > 0) {
    return unaryExpr.ops.reduce((acc, op) => {
      switch (op) {
        case "-":
          return -acc;
        case "!":
          return !acc;
        default:
          throw new Error(`Unexpected operator ${op}`);
      }
    }, member);
  }
  return member;
}

function evalMember(member: Member, activation: Activation): Value {
  if (member instanceof IndexingExpr) {
    return evalIndexingExpr(member, activation);
  }
  if (member instanceof FunctionCallExpr) {
    return evalFunctionCallExpr(member, activation);
  }
  return evalPrimary(member, activation);
}

function evalIndexingExpr(indexingExpr: IndexingExpr, activation: Activation): Value {
  const member = evalMember(indexingExpr.member, activation);
  const index = evalExpr(indexingExpr.index, activation);
  if (typeof member === "object" && member[index] !== undefined) {
    return member[index];
  } else {
    throw new Error(`Unexpected member ${member}`);
  }
}

function evalFunctionCallExpr(functionCallExpr: FunctionCallExpr, activation: Activation): Value {
  const member = evalMember(functionCallExpr.member, activation);
  if (typeof member === "function") {
    return member(...functionCallExpr.exprs.map((expr) => evalExpr(expr, activation)));
  } else {
    throw new Error(`Unexpected member ${member}`);
  }
}

function evalPrimary(primary: Primary, activation: Activation): Value {
  if (primary instanceof Literal) {
    return primary.value;
  } else if (primary instanceof Ident) {
    return evalIdent(primary, activation);
  } else if (primary instanceof ArrayLit) {
    return primary.exprs.map((expr) => evalExpr(expr, activation));
  } else if (primary instanceof MapLit) {
    return primary.exprs.map(([key, value]) => [evalExpr(key, activation), evalExpr(value, activation)]);
  } else {
    return evalExpr(primary, activation);
  }
}

function evalIdent(ident: Ident, activation: Activation): Value {
  if (!activation[ident.name]) {
    if (!BUILTINS[ident.name]) {
      throw new Error(`Unexpected identifier ${ident.name}`);
    }
    return BUILTINS[ident.name];
  }
  return activation[ident.name];
}
