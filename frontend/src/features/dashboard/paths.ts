/** The dashboard's address for one district, or for the whole country. */
export function districtPath(code: string | null): string {
  return code === null ? '/app' : `/app/districts/${code}`
}
