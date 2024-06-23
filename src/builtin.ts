const BUILTINS = {
  contains: buildinContains,
};

function buildinContains(arr: any[], value: any): Value {
  return new BoolValue(arr.includes(value));
}
