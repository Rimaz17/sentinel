/** The public dashboard's address for one district, or for the whole country. */
export function publicDistrictPath(code: string | null): string {
  return code === null ? '/dashboard' : `/dashboard?district=${code}`
}
