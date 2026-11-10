/** Where to go after signing in: the page that bounced the user to /login, else the home page. */
export function redirectTarget(state: unknown): string {
  if (typeof state === "object" && state !== null && "from" in state) {
    const from = state.from;
    if (typeof from === "object" && from !== null && "pathname" in from && typeof from.pathname === "string") {
      const search = "search" in from && typeof from.search === "string" ? from.search : "";
      return from.pathname + search;
    }
  }
  return "/";
}
