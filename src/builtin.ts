const BUILTINS = {
  contains: buildinContains,
};

function buildinContains(arr: any[], value: any) {
  return arr.includes(value);
}
