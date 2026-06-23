import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { AppHeader } from './shell/AppHeader';
import { BottomNav } from './shell/BottomNav';
import { SyncBanner } from './shell/SyncBanner';
import { QuickFindScreen } from './routes/quickfind';
import { OperationsScreen } from './routes/operations';
import { InventoryScreen } from './routes/inventory';
import { CommandScreen } from './routes/command';
import { SettingsScreen } from './routes/settings';
import { GalleryScreen } from './routes/gallery';
import { AuthRoute } from './routes/auth';
import { CreateDepartmentRoute } from './routes/create-department';
import { JoinDepartmentRoute } from './routes/join-department';
import { HelpRoute } from './routes/help';
import { UserManagerScreen } from '@ui/admin';
import { EmptyState } from '@ui/primitives';
import { OnboardingHost } from '@ui/onboarding';
import { RequireDepartment } from '@ui/dept';

/**
 * Route tree — the locked 5-tab spine (ADR-014) + the /gallery dev surface,
 * wrapped in a pathless `shell` layout so the pre-shell /auth route (workflow
 * 06) can mount OUTSIDE the chrome (no header, no bottom nav). Code-based
 * routes; nav transitions are plain renders (no animation — 00-ia-foundation.md).
 */

// Bare root — renders only the matched child, so /auth fills the screen.
function RootBare() {
  return <Outlet />;
}

// The tab shell: header + guest sync banner + scroll pane + fixed bottom nav.
function RootLayout() {
  return (
    <div className="fs-shell">
      <AppHeader />
      <SyncBanner />
      <main className="fs-shell-main">
        <Outlet />
      </main>
      <BottomNav />
      {/* First-run tour — renders only when active (account-creation or a Settings
          replay); mounted here so it survives tab changes and overlays the chrome. */}
      <OnboardingHost />
    </div>
  );
}

const rootRoute = createRootRoute({ component: RootBare });

// Pathless layout route — every tab renders inside the shell; /auth does not.
const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'shell',
  component: RootLayout,
});

const routeTree = rootRoute.addChildren([
  shellRoute.addChildren([
    // Cold open lands on Operations — the working screen, not the calculator
    // (Phase H gate kick-back, #248). Quick Find lives at /quickfind.
    createRoute({
      getParentRoute: () => shellRoute,
      path: '/',
      beforeLoad: () => {
        throw redirect({ to: '/operations' });
      },
    }),
    // Quick Find is OPEN to everyone (stateless calculator, no department data).
    createRoute({ getParentRoute: () => shellRoute, path: '/quickfind', component: QuickFindScreen }),
    // The dept-scoped + account tabs are gated: a signed-in member with no department
    // sees the set-up gate instead (RequireDepartment). Guests pass through.
    createRoute({ getParentRoute: () => shellRoute, path: '/operations', component: () => <RequireDepartment><OperationsScreen /></RequireDepartment> }),
    createRoute({ getParentRoute: () => shellRoute, path: '/inventory', component: () => <RequireDepartment><InventoryScreen /></RequireDepartment> }),
    createRoute({ getParentRoute: () => shellRoute, path: '/command', component: () => <RequireDepartment><CommandScreen /></RequireDepartment> }),
    createRoute({ getParentRoute: () => shellRoute, path: '/settings', component: () => <RequireDepartment><SettingsScreen /></RequireDepartment> }),
    // The Admin-gated User Manager (#381) — reached from the Settings Administration gateway.
    // RequireDepartment gates the dept; the screen itself backstops the manageUsers permission
    // (a direct /users nav by a non-admin shows the access-only state).
    createRoute({ getParentRoute: () => shellRoute, path: '/users', component: () => <RequireDepartment><UserManagerScreen /></RequireDepartment> }),
    createRoute({ getParentRoute: () => shellRoute, path: '/help', component: HelpRoute }),
    createRoute({ getParentRoute: () => shellRoute, path: '/gallery', component: GalleryScreen }),
  ]),
  // Pre-shell, chrome-free — direct children of root, not the shell. /auth is
  // workflow 06; /create-department is workflow 07 (reached forward from sign-in
  // or Settings, never a cold-open gate — ADR-015).
  createRoute({ getParentRoute: () => rootRoute, path: '/auth', component: AuthRoute }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/create-department',
    component: CreateDepartmentRoute,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/join-department',
    component: JoinDepartmentRoute,
  }),
]);

// A render throw inside a route shows a recoverable screen instead of a blank
// page; an unknown path points back to Operations (audit W6). The App-root
// ErrorBoundary backstops anything outside the router.
function RouteError({ error }: { error: Error }) {
  return (
    <EmptyState
      variant="upstream-blocked"
      headline="Something went wrong on this screen"
      reason={error instanceof Error ? error.message : 'An unexpected error occurred'}
      action={{ label: 'Reload', onPress: () => window.location.reload() }}
    />
  );
}

function RouteNotFound() {
  return (
    <EmptyState
      variant="filtered"
      headline="Screen not found"
      reason="That view doesn't exist — head back to Operations"
      action={{ label: 'Go to Operations', onPress: () => window.location.assign('/operations') }}
    />
  );
}

export const router = createRouter({
  routeTree,
  defaultErrorComponent: RouteError,
  defaultNotFoundComponent: RouteNotFound,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
