import { type FormEvent, useId, useState } from 'react'
import { SubmitButton } from '@/components/ui/Action'
import { Field, FormError } from '@/components/ui/Field'
import { fieldControl, fieldLabel } from '@/components/ui/controls'
import { Email } from '@/components/ui/Email'
import { Panel, PanelHeading } from '@/components/ui/Panel'
import { QuietButton } from '@/components/ui/QuietButton'
import { ACTIVATE_PATH } from '@/features/auth/ActivatePage'
import { useAccount } from '@/features/auth/session'
import { isDemoAdministrator, useDemo } from '@/features/demo/api'
import type { Role } from '@/lib/api/session'
import { formatCount, formatDateTime } from '@/features/dashboard/format'
import { EmptyState, LoadingRows, QueryView } from '@/features/dashboard/QueryView'
import { ApiError } from '@/lib/api/client'
import { cx, labelSm, sectionTitle } from '@/styles/recipes'
import {
  type AdminAccount,
  type DistrictName,
  type IssuedAccount,
  useAccounts,
  useChangeAccount,
  useCreateInspector,
  useDistrictNames,
  useNewLink,
} from './api'
import { RowActions } from './RowActions'
import { ShownOnce } from './ShownOnce'

const panelTitle = 'text-section leading-snug font-medium tracking-tight'

/** The address an inspector follows, with the link's secret after the #. */
function activationLink(token: string): string {
  return `${window.location.origin}${ACTIVATE_PATH}#token=${token}`
}

/**
 * Inspector accounts are created here, by an administrator, and nowhere else.
 * A new inspector has no password: the page shows a one-time link to pass on,
 * and following it they choose their own.
 *
 * Two sheet panels: the title and the new inspector form on the left, every
 * account on the right, grouped by role. From 68rem they stand side by side,
 * the list the wider; below that the list follows the form.
 */
export function AccountsSection() {
  const [issued, setIssued] = useState<IssuedAccount | null>(null)
  const districtNames = useDistrictNames()
  const me = useAccount()
  const demo = useDemo()
  const demoAdministrator = isDemoAdministrator(demo.data, me.email)

  return (
    <div className="grid gap-md xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] xl:items-start">
      <Panel as="div" className="gap-md md:p-lg">
        <div className="grid gap-xs">
          <h1 className={sectionTitle}>Inspectors and accounts</h1>
          <p className="max-w-measure text-body text-ink-70">
            Public health inspectors cannot sign up. Create their account here, then pass them the
            link it gives you, by a channel you trust. Sentinel sends no email.
          </p>
        </div>
        <section
          aria-labelledby="new-inspector"
          className="grid gap-sm border-t border-t-ink-14 pt-md"
        >
          <h2 id="new-inspector" className={panelTitle}>
            New inspector
          </h2>
          {demoAdministrator ? (
            <p className="max-w-measure text-small font-medium">
              Use a made-up name and email address. Other visitors signed in as the demo
              administrator can see this list until the nightly reset removes what visitors made.
            </p>
          ) : null}
          <NewInspectorForm districts={districtNames.data ?? []} onCreated={setIssued} />
        </section>
      </Panel>

      <div className="grid min-w-0 content-start gap-md">
        {issued ? (
          <ShownOnce
            key={issued.activationToken}
            title="Activation link"
            value={activationLink(issued.activationToken)}
            onDismiss={() => setIssued(null)}
          >
            For <span className="font-medium text-ink">{issued.account.displayName}</span>,{' '}
            <span className="font-mono">{issued.account.email}</span>. It works once, until{' '}
            {formatDateTime(issued.activationExpiresAt)} Sri Lanka time. Only a hash is kept, so it
            cannot be shown again; issue a new one if it is lost.
          </ShownOnce>
        ) : null}
        <Panel labelledBy="accounts-heading">
          <AccountList districts={districtNames.data ?? []} onLinkIssued={setIssued} />
        </Panel>
      </div>
    </div>
  )
}

function NewInspectorForm({
  districts,
  onCreated,
}: {
  districts: DistrictName[]
  onCreated: (issued: IssuedAccount) => void
}) {
  const create = useCreateInspector()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [national, setNational] = useState(false)
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set())

  function toggle(code: string) {
    setChosen((current) => {
      const next = new Set(current)
      if (next.has(code)) {
        next.delete(code)
      } else {
        next.add(code)
      }
      return next
    })
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    create.mutate(
      { displayName, email, districts: national ? ['*'] : [...chosen] },
      {
        onSuccess: (issued) => {
          onCreated(issued)
          setDisplayName('')
          setEmail('')
          setNational(false)
          setChosen(new Set())
        },
      },
    )
  }

  const error = create.error instanceof ApiError ? create.error : null

  return (
    <form onSubmit={submit} className="grid gap-md" noValidate>
      <Field
        label="Name"
        name="displayName"
        width="lg"
        autoComplete="off"
        required
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        error={error?.problemWith('displayName')}
      />
      <Field
        label="Email address"
        type="email"
        name="email"
        width="lg"
        autoComplete="off"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={error?.problemWith('email')}
      />
      <fieldset className="m-0 grid gap-xs border-0 p-0">
        <legend className={cx(fieldLabel, 'mb-2xs')}>Districts covered</legend>
        <label
          className={cx(
            'flex cursor-pointer items-center gap-xs rounded-control border border-ink-24 bg-field px-xs py-sm text-small shadow-field',
            'transition-colors duration-(--dur-fast) ease-out hover:border-ink-70',
            'has-checked:border-ink has-checked:bg-ink-08 has-checked:font-medium',
          )}
        >
          <input
            type="checkbox"
            checked={national}
            onChange={(event) => setNational(event.target.checked)}
            className="m-0 size-[1rem] shrink-0 cursor-pointer"
          />
          Every district: a national inspector
        </label>
        {national ? null : (
          <div className="grid gap-2xs border-t border-t-ink-14 pt-xs">
            <p className="flex flex-wrap items-baseline justify-between gap-x-sm text-small text-ink-70">
              <span>Or choose one or more districts</span>
              <span className={labelSm} aria-live="polite">
                {chosen.size === 1 ? '1 chosen' : `${chosen.size} chosen`}
              </span>
            </p>
            <div className="grid grid-cols-3 gap-x-sm gap-y-2xs phone:grid-cols-2">
              {districts.map((district) => (
                <label
                  key={district.code}
                  className="inline-flex cursor-pointer items-center gap-xs text-small has-checked:font-medium"
                >
                  <input
                    type="checkbox"
                    checked={chosen.has(district.code)}
                    onChange={() => toggle(district.code)}
                    className="m-0 size-[0.9rem] shrink-0 cursor-pointer"
                  />
                  {district.name}
                </label>
              ))}
            </div>
          </div>
        )}
        {error?.problemWith('districts') ? (
          <p className="border-l-2 border-l-ink ps-2xs text-small font-medium">
            Districts {error.problemWith('districts')}.
          </p>
        ) : null}
      </fieldset>
      {error && error.fieldProblems.length === 0 ? <FormError>{error.message}</FormError> : null}
      <div>
        <SubmitButton busy={create.isPending}>
          {create.isPending ? 'Creating' : 'Create and get a link'}
        </SubmitButton>
      </div>
    </form>
  )
}

/** The roles in the order the list shows them: inspectors first, the accounts this page is for. */
const GROUPS: { role: Role; title: string }[] = [
  { role: 'PHI', title: 'Public health inspectors' },
  { role: 'DATA_PROVIDER', title: 'Data providers' },
  { role: 'ADMIN', title: 'Administrators' },
]

/** More accounts than this, and the list offers a search. */
const SEARCH_FROM = 6

function AccountList({
  districts,
  onLinkIssued,
}: {
  districts: DistrictName[]
  onLinkIssued: (issued: IssuedAccount) => void
}) {
  const accounts = useAccounts()
  const [search, setSearch] = useState('')
  const searchId = useId()

  return (
    <>
      <PanelHeading
        id="accounts-heading"
        aside={
          accounts.data ? (
            <span className={cx(labelSm, 'text-ink-70')}>
              {accounts.data.length === 1
                ? '1 account'
                : `${formatCount(accounts.data.length)} accounts`}
            </span>
          ) : null
        }
      >
        Accounts
      </PanelHeading>
      <QueryView
        query={accounts}
        what="accounts"
        loading={<LoadingRows label="Loading accounts" rows={4} />}
        isEmpty={(list) => list.length === 0}
        empty={<EmptyState title="No accounts yet.">Create an inspector to begin.</EmptyState>}
      >
        {(list) => {
          const wanted = search.trim().toLowerCase()
          const shown = list.filter(
            (account) =>
              account.displayName.toLowerCase().includes(wanted) || account.email.includes(wanted),
          )
          return (
            <div className="grid gap-md">
              {list.length > SEARCH_FROM ? (
                <div>
                  <label htmlFor={searchId} className="sr-only">
                    Find an account
                  </label>
                  <input
                    id={searchId}
                    type="search"
                    placeholder="Find an account by name or email"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className={cx(fieldControl(), 'h-[2.5rem] px-sm text-small')}
                  />
                </div>
              ) : null}
              {shown.length === 0 ? (
                <p className="text-small text-ink-70">No account matches “{search.trim()}”.</p>
              ) : (
                GROUPS.map(({ role, title }) => {
                  const members = shown.filter((account) => account.role === role)
                  return members.length === 0 ? null : (
                    <section key={role} aria-labelledby={`${searchId}-${role}`} className="grid">
                      <h3
                        id={`${searchId}-${role}`}
                        className="flex items-baseline justify-between gap-x-sm border-b border-b-ink pb-2xs text-small font-medium"
                      >
                        {title}
                        <span className={cx(labelSm, 'font-normal text-ink-70')}>
                          {formatCount(members.length)}
                        </span>
                      </h3>
                      <ul>
                        {members.map((account) => (
                          <li key={account.id}>
                            <AccountRow
                              account={account}
                              districts={districts}
                              onLinkIssued={onLinkIssued}
                            />
                          </li>
                        ))}
                      </ul>
                    </section>
                  )
                })
              )}
            </div>
          )
        }}
      </QueryView>
    </>
  )
}

function AccountRow({
  account,
  districts,
  onLinkIssued,
}: {
  account: AdminAccount
  districts: DistrictName[]
  onLinkIssued: (issued: IssuedAccount) => void
}) {
  const me = useAccount()
  const change = useChangeAccount()
  const newLink = useNewLink()
  const failed = change.error ?? newLink.error
  const reach = covers(account, districts)

  return (
    <article
      aria-label={account.displayName}
      className="grid gap-x-md gap-y-xs border-b border-b-ink-14 py-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
    >
      <div className="grid min-w-0 gap-3xs">
        <div className="flex flex-wrap items-baseline gap-x-sm gap-y-3xs">
          <h4 className={cx('text-body font-medium', account.enabled ? null : 'text-ink-70')}>
            {account.displayName}
          </h4>
          <p className="font-mono text-small break-words text-ink-70">
            <Email address={account.email} />
          </p>
        </div>
        {reach ? <p className="text-small">{reach}</p> : null}
        <p className={cx(labelSm, 'text-ink-70')}>{state(account)}</p>
        {failed ? (
          <p role="alert" className={cx(labelSm, 'text-ink')}>
            {failed.message}
          </p>
        ) : null}
      </div>
      {account.id === me.id ? (
        <p className={cx(labelSm, 'text-ink-70')}>Your own account</p>
      ) : (
        <RowActions locked={account.lockedInDemo}>
          <QuietButton
            onClick={() => change.mutate({ id: account.id, enabled: !account.enabled })}
            disabled={change.isPending || account.lockedInDemo}
          >
            {account.enabled ? 'Disable' : 'Enable'}
          </QuietButton>
          {account.enabled ? (
            <QuietButton
              onClick={() => newLink.mutate(account.id, { onSuccess: onLinkIssued })}
              disabled={newLink.isPending || account.lockedInDemo}
            >
              {account.activated ? 'New password link' : 'New activation link'}
            </QuietButton>
          ) : null}
        </RowActions>
      )}
    </article>
  )
}

/** What an account reaches, in words; the group it sits in already names its role. */
function covers(account: AdminAccount, districts: DistrictName[]): string | null {
  if (account.role === 'DATA_PROVIDER') {
    return `Reports for ${account.facilityName ?? account.facilityCode ?? 'no facility'}`
  }
  if (account.role !== 'PHI') {
    return null
  }
  if (account.districts.includes('*')) {
    return 'Covers every district'
  }
  const names = new Map(districts.map((district) => [district.code, district.name]))
  return `Covers ${account.districts.map((code) => names.get(code) ?? code).join(', ')}`
}

function state(account: AdminAccount): string {
  if (!account.enabled) {
    return 'Disabled'
  }
  if (!account.activated) {
    return account.activationExpiresAt
      ? `Not activated · link expires ${formatDateTime(account.activationExpiresAt)}`
      : 'Not activated · no link outstanding'
  }
  return `Active · created ${formatDateTime(account.createdAt)}`
}
