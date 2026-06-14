import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { AppHeader } from './shell/AppHeader';
import { BottomNav } from './shell/BottomNav';
import { QuickFindScreen } from './routes/quickfind';
import { OperationsScreen } from './routes/operations';
import { InventoryScreen } from './routes/inventory';
import { CommandScreen } from './routes/command';
import { SettingsScreen } from './routes/settings';
import { GalleryScreen } from './routes/gallery';
import { EmptyState } from '@ui/primitives';

/**
 * Route tree — the locked 5-tab spine (ADR-014) + the /gallery dev surface.
 * Code-based routes; nav transitions are plain renders (no animation —
 * 00-ia-foundation.md). Screens are stubs until S4–S6 fill them in.
 */
function RootLayout() {
  return (
    <div className="fs-shell">
      <AppHeader />
      <main className="fs-shell-main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

const rootRoute = createRootRoute({ component: RootLayout });

const routeTree = rootRoute.addChildren([
  // Cold open lands on Operations — the working screen, not the calculator
  // (Phase H gate kick-back, #248). Quick Find lives at /quickfind.
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    beforeLoad: () => {
      throw redirect({ to: '/operations' });
    },
  }),
  createRoute({ getParentRoute: () => rootRoute, path: '/quickfind', component: QuickFindScreen }),
  createRoute({ getParentRoute: () => rootRoute, path: '/operations', component: OperationsScreen }),
  createRoute({ getParentRoute: () => rootRoute, path: '/inventory', component: InventoryScreen }),
  createRoute({ getParentRoute: () => rootRoute, path: '/command', component: CommandScreen }),
  createRoute({ getParentRoute: () => rootRoute, path: '/settings', component: SettingsScreen }),
  createRoute({ getParentRoute: () => rootRoute, path: '/gallery', component: GalleryScreen }),
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
