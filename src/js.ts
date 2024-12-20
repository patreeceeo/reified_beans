export function isPrimative(value: any): boolean {
  return value !== Object(value);
}
