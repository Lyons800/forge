/**
 * Weekly ship-cap accounting.
 * Pure, dependency-free function — easily unit tested.
 */

/**
 * Returns true iff shipsThisWeek is below the cap (default 3).
 * The engine must call countShipsSince to get shipsThisWeek before calling this.
 */
export function canShipThisWeek(shipsThisWeek: number, cap = 3): boolean {
  return shipsThisWeek < cap;
}
