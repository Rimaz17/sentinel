/**
 * A failed API call. The API answers errors as RFC 9457 problem details, whose
 * `detail` is written for people and never echoes submitted values, so it is
 * safe to show.
 */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type Params = Record<string, string | number | null | undefined>

const UNREACHABLE = 'The API could not be reached. Check that it is running.'

/*
 * What a proxy or gateway answers when the API behind it is down or not
 * started: the dev server's proxy, for one, answers 502. The API itself never
 * sends these, so without a problem body they mean the API was not reached.
 */
const GATEWAY_STATUSES = new Set([502, 503, 504])

/** A path under /api with its query string, leaving out empty parameters. */
export function apiPath(path: string, params: Params = {}): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') {
      query.set(key, String(value))
    }
  }
  const search = query.toString()
  return `/api${path}${search ? `?${search}` : ''}`
}

/**
 * GETs JSON from the API. The response is trusted to match `T`: the types in
 * ./types.ts mirror the API's own response records, and both sides are tested
 * against those shapes.
 */
export async function getJson<T>(path: string, params?: Params, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(apiPath(path, params), {
      headers: { Accept: 'application/json' },
      ...(signal ? { signal } : {}),
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw cause
    }
    throw new ApiError(0, UNREACHABLE)
  }

  if (!response.ok) {
    throw new ApiError(response.status, await problemDetail(response))
  }
  const body: unknown = await response.json()
  return body as T
}

async function problemDetail(response: Response): Promise<string> {
  const fallback = GATEWAY_STATUSES.has(response.status)
    ? UNREACHABLE
    : `The API answered ${response.status}.`
  try {
    const problem: unknown = await response.json()
    if (
      typeof problem === 'object' &&
      problem !== null &&
      'detail' in problem &&
      typeof problem.detail === 'string'
    ) {
      return problem.detail
    }
  } catch {
    // Not JSON: a proxy error page, for instance. Fall through to the status.
  }
  return fallback
}
