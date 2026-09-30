/**
 * An email address that wraps, when it must, before its @ rather than in the
 * middle of a word.
 */
export function Email({ address }: { address: string }) {
  const at = address.indexOf('@')
  return at < 0 ? (
    address
  ) : (
    <>
      {address.slice(0, at)}
      <wbr />
      {address.slice(at)}
    </>
  )
}
