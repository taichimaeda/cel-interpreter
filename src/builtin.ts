import { BoolValue, Value } from "./interpreter";

const BUILTINS = {
  contains: builtinContains,
};

export function builtin(method: string, ...args: Value[]): Value {
  if (BUILTINS[method] !== undefined && args.length === BUILTINS[method].length) {
    return BUILTINS[method](...args);
  }
  throw new Error(`Unknown builtin: ${method}`);
}

function builtinContains(arr: any[], value: any): Value {
  return new BoolValue(arr.includes(value));
}
