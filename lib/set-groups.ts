// Group populated sets, preserving numeric order even when set numbers have gaps.
export function groupProductSets(sets: readonly number[]): number[][] {
  const ordered = [...new Set(sets)].sort((a, b) => a - b);
  const groups: number[][] = [];
  for (let index = 0; index < ordered.length; index += 5) groups.push(ordered.slice(index, index + 5));
  return groups;
}
