import { currentSession, needsRenewal, renewSession } from './session'

/** A field the API refused, and why, in words that never repeat what was sent. */
export type FieldProblem = { field: string; message: string }

/**
 * A failed API call. The API answers errors as RFC 9457 problem details, whose
 * `detail` is written for people and never echoes submitted values, so it is
 * safe to show. A refused form also names each field at fault.
 */
export class ApiError extends Error {
  readonly status: number
  readonly fieldProblems: FieldProblem[]

  constructor(status: number, message: string, fieldProblems: FieldProblem[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldProblems = fieldProblems
  }

  /** What the API said about one field, if anything. */
  problemWith(field: string): string | undefined {
    return this.fieldProblems.find((problem) => problem.field === field)?.message
  }
}

type Params = Record<string, string | number | null | undefined>

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'

type RequestOptions = {
  method?: Method
  params?: Params
  body?: unknown
  signal?: AbortSignal | undefined
}

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
 * Calls the API as the signed-in person, if anyone is. A token about to expire
 * is renewed first, and a request refused with 401 is renewed and sent once
 * more, so a long shift is never interrupted by a token running out. The
 * response is trusted to match `T`: the types mirror the API's own response
 * records, and both sides are tested against those shapes.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let session = currentSession()
  if (session && needsRenewal(session)) {
    session = await renewSession()
  }
  let response = await send(path, options, session?.accessToken)
  if (response.status === 401 && session) {
    const renewed = await renewSession()
    if (renewed) {
      response = await send(path, options, renewed.accessToken)
    }
  }
  if (!response.ok) {
    throw await problem(response)
  }
  if (response.status === 204) {
    return undefined as T
  }
  const body: unknown = await response.json()
  return body as T
}

/** GETs JSON from the API. */
export function getJson<T>(path: string, params?: Params, signal?: AbortSignal): Promise<T> {
  return apiRequest<T>(path, { params: params ?? {}, signal })
}

async function send(
  path: string,
  { method = 'GET', params = {}, body, signal }: RequestOptions,
  accessToken: string | undefined,
): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }
  try {
    return await fetch(apiPath(path, params), {
      ...(method === 'GET' ? {} : { method }),
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      ...(signal ? { signal } : {}),
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw cause
    }
    throw new ApiError(0, UNREACHABLE)
  }
}

async function problem(response: Response): Promise<ApiError> {
  const fallback = GATEWAY_STATUSES.has(response.status)
    ? UNREACHABLE
    : `The API answered ${response.status}.`
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null && 'detail' in body) {
      const detail = typeof body.detail === 'string' ? body.detail : fallback
      const errors = 'errors' in body && Array.isArray(body.errors) ? body.errors : []
      return new ApiError(response.status, detail, errors.filter(isFieldProblem))
    }
  } catch {
    // Not JSON: a proxy error page, for instance. Fall through to the status.
  }
  return new ApiError(response.status, fallback)
}

function isFieldProblem(value: unknown): value is FieldProblem {
  return (
    typeof value === 'object' &&
    value !== null &&
    'field' in value &&
    typeof value.field === 'string' &&
    'message' in value &&
    typeof value.message === 'string'
  )
}
