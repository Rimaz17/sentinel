/**
 * An invite code as it is issued, KDY-XXX-XXXX, however it was typed: capitals
 * and dashes do not matter to the check, so they do not matter to the display.
 */
export function displayCode(typed: string): string {
  const plain = typed.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return plain.length === 10
    ? `${plain.slice(0, 3)}-${plain.slice(3, 6)}-${plain.slice(6)}`
    : typed.trim().toUpperCase()
}
