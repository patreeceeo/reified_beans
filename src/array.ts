/**
 * Utility function to find duplicates within the same array.
 */
export function findArrayDuplicates<T>(arr: T[]): T[] {
  const duplicates: T[] = [];
  const seen = new Set<T>();
  for (const item of arr) {
    if (seen.has(item)) {
      duplicates.push(item);
    } else {
      seen.add(item);
    }
  }
  return duplicates;
}
