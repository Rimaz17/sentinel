import { lazy, type ReactNode, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AdminPage } from '@/features/admin/AdminPage'
import { ACTIVATE_PATH, ActivatePage } from '@/features/auth/ActivatePage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { RequireRole } from '@/features/auth/RequireRole'
import { SignInPage } from '@/features/auth/SignInPage'
import { LandingPage } from '@/features/landing/LandingPage'
import { SubmitPage } from '@/features/submit/SubmitPage'
import { NotFoundPage } from '@/features/notfound/NotFoundPage'

/*
 * The dashboard, with Leaflet and the query library, loads only when an
 * inspector opens it. The landing page is the public entry point and is often
 * opened on a low-end phone over mobile data; it should not download a map
 * library it never draws.
 */
const DashboardPage = lazy(() =>
  import('@/features/dashboard/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
)

/* The public dashboard loads on demand too: it carries Leaflet and the district outlines. */
const PublicDashboardPage = lazy(() =>
  import('@/features/public/PublicDashboardPage').then((module) => ({
    default: module.PublicDashboardPage,
  })),
)

function PublicDashboard() {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-gutter text-small text-ink-70">
          Loading the public dashboard
        </p>
      }
    >
      <PublicDashboardPage />
    </Suspense>
  )
}

function Dashboard() {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-gutter text-small text-ink-70">
          Loading the dashboard
        </p>
      }
    >
      <DashboardPage />
    </Suspense>
  )
}

/** The internal dashboard is for public health inspectors only. */
function Inspector({ page }: { page: ReactNode }) {
  return <RequireRole allow="PHI">{page}</RequireRole>
}

/**
 * The route map from the project plan.
 *
 * Every route in the plan is built. An address that matches none of them
 * renders a page that says so, with a way back to the front page.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route path="/dashboard" element={<PublicDashboard />} />

      <Route path="/signin" element={<SignInPage />} />

      <Route path="/register" element={<RegisterPage />} />
      <Route path={ACTIVATE_PATH} element={<ActivatePage />} />

      <Route
        path="/submit"
        element={
          <RequireRole allow="DATA_PROVIDER">
            <SubmitPage />
          </RequireRole>
        }
      />

      <Route path="/app" element={<Inspector page={<Dashboard />} />} />
      <Route path="/app/districts/:code" element={<Inspector page={<Dashboard />} />} />

      <Route
        path="/app/admin/*"
        element={
          <RequireRole allow="ADMIN">
            <AdminPage />
          </RequireRole>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
