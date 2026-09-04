// Purpose: Protect the English-only console and resolve its organization server-side.

import type { ReactNode } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import ConsoleShell from "@/components/ConsoleShell"
import { PartnerApiError, partnerApiRequest } from "@/lib/partner-api"
import type { Organization } from "@/lib/types"

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const collapsed = (await cookies()).get("swapgo_partner_sidebar")?.value === "rail"
  let organization: Organization
  try {
    organization = (await partnerApiRequest<Organization>("/organization")).data
  } catch (error) {
    if (error instanceof PartnerApiError && (error.status === 401 || error.status === 403)) {
      redirect("/connect?reason=invalid-key")
    }
    throw error
  }
  return <ConsoleShell organizationName={organization.name} initialCollapsed={collapsed}>{children}</ConsoleShell>
}
