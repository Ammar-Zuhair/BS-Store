export function createReturnPolicy() {
  let leftSafely = false;
  return {
    background(safe: boolean) { leftSafely = safe; },
    resume(safe: boolean, pending: boolean) {
      const apply = leftSafely && safe && pending;
      leftSafely = false;
      return apply;
    },
  };
}
