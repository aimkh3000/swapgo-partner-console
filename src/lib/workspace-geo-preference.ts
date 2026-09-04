// Purpose: Share the non-sensitive geo scope between SSR routes and the browser.

export const WORKSPACE_GEO_COOKIE = "swapgo_partner_workspace_geo"
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export function normalizeRememberedGeo(value: string | null | undefined): string {
  const normalized = value?.trim().toLowerCase() || ""
  return /^[a-z0-9][a-z0-9_-]{1,95}$/.test(normalized) ? normalized : ""
}

export function rememberWorkspaceGeo(value: string | null): void {
  if (typeof document === "undefined") return
  const normalized = normalizeRememberedGeo(value)
  document.cookie = normalized
    ? `${WORKSPACE_GEO_COOKIE}=${encodeURIComponent(normalized)}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`
    : `${WORKSPACE_GEO_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
}
