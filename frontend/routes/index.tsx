// Root entry point. Auth-aware client-side redirect so the user
// never sees the dashboard skeleton when not logged in.
//
//   logged in  → /dashboard
//   logged out → /login
//
// We render a tiny island instead of a server-side 302 so the redirect
// decision can read the JWT from localStorage. A 302 to /dashboard
// would force the dashboard route to load (and flash its skeleton)
// before its own client-side auth check could redirect to /login.

import RootRedirect from "../islands/RootRedirect.tsx";

export default function Root() {
  return <RootRedirect />;
}
