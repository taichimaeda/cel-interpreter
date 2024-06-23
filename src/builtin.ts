import { BoolValue, ListValue, MapValue, Value } from "./interpreter";

const BUILTINS = {
  contains: builtinContains,
};

// TODO: Handle macros
export function builtin(method: string, ...args: Value[]): Value {
  if (BUILTINS[method] !== undefined && args.length === BUILTINS[method].length) {
    return BUILTINS[method](...args);
  }
  throw new Error(`Unknown builtin: ${method}`);
}

function builtinContains(list: ListValue, value: Value): Value {
  if (value instanceof ListValue) {
    throw new Error("List contains is not implemented for nested lists");
  }
  if (value instanceof MapValue) {
    throw new Error("List contains is not implemented for maps");
  }
  return new BoolValue(list.values.includes(value.value));
}
