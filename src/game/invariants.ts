/** Resolve a value whose lifetime is guaranteed by its owning controller. */
export function present<T>(value: T | null | undefined, message = 'Game controller invariant failed'): T {
  if (value === null || value === undefined) throw new Error(message);
  return value;
}
