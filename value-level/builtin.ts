import { BoolValue, ByteValue, IntValue, ListValue, MapValue, StringValue, Value } from "./interpreter";

const BUILTINS = {
  size: builtinSize,
  startsWith: builtinStartsWith,
  endsWith: builtinEndsWith,
  contains: builtinContains,
  matches: builtinMatches,
};

// TODO: Handle macros
export function builtin(method: string, ...args: Value[]): Value {
  if (BUILTINS[method] !== undefined && args.length === BUILTINS[method].length) {
    return BUILTINS[method](...args);
  }
  throw new Error(`Unknown builtin: ${method}`);
}

function builtinSize(object: Value): Value {
  if (object instanceof StringValue || object instanceof ByteValue || object instanceof ListValue) {
    return new IntValue(object.value.length);
  }
  if (object instanceof MapValue) {
    return new IntValue(Object.keys(object.value).length);
  }
  throw new Error("size() requires a string, byte, list, or map");
}

function builtinStartsWith(string: Value, prefix: Value): Value {
  if (!(prefix instanceof StringValue && string instanceof StringValue)) {
    throw new Error("startsWith() requires two strings");
  }
  return new BoolValue(string.value.startsWith(prefix.value));
}

function builtinEndsWith(string: Value, suffix: Value): Value {
  if (!(suffix instanceof StringValue && string instanceof StringValue)) {
    throw new Error("endsWith() requires two strings");
  }
  return new BoolValue(string.value.endsWith(suffix.value));
}

function builtinContains(string: Value, pattern: Value): Value {
  if (!(pattern instanceof StringValue && string instanceof StringValue)) {
    throw new Error("contains() requires two strings");
  }
  return new BoolValue(string.value.includes(pattern.value));
}

function builtinMatches(string: Value, pattern: Value): Value {
  if (!(pattern instanceof StringValue && string instanceof StringValue)) {
    throw new Error("matches() requires two strings");
  }
  return new BoolValue(new RegExp(pattern.value).test(string.value));
}
