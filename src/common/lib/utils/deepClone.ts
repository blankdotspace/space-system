export function deepClone<T>(value: T): T {
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch {
      // Fall through to JSON clone for non-structured-cloneable values.
    }
  }

  return JSON.parse(JSON.stringify(value)) as T;
}
