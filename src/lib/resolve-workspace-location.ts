// Purpose: Resolve path-owned geo while preserving real Partner API failures.

import "server-only"

import { PartnerApiError, partnerApiRequest } from "@/lib/partner-api"
import type { LocationReference } from "@/lib/types"

export async function resolveWorkspaceLocation(
  geo: string,
): Promise<LocationReference | null> {
  if (!geo) return null

  try {
    return (await partnerApiRequest<LocationReference>(
      `/references/locations/resolve?geo=${encodeURIComponent(geo)}&locale=en`,
    )).data
  } catch (error) {
    if (error instanceof PartnerApiError && (error.status === 404 || error.status === 422)) {
      return null
    }
    throw error
  }
}
