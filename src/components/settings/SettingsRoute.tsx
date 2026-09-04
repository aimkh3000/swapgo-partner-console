// Purpose: Server-render one settings route with a shared header and API snapshot.

import PageFrame from "@/components/PageFrame"
import SettingsWorkspace, { SettingsTabs, type SettingsTab } from "@/components/settings/SettingsWorkspace"
import { partnerApiRequest } from "@/lib/partner-api"
import type { LegalSnapshot, Organization, OrganizationProfile } from "@/lib/types"

export default async function SettingsRoute({ activeTab }: { activeTab: SettingsTab }) {
  const [organization, profile, legal] = await Promise.all([
    partnerApiRequest<Organization>("/organization"),
    partnerApiRequest<OrganizationProfile>("/organization/profile"),
    partnerApiRequest<LegalSnapshot>("/organization/legal?locale=en"),
  ])

  return (
    <PageFrame title="" centerAction={<SettingsTabs active={activeTab} />} contained>
      <SettingsWorkspace
        activeTab={activeTab}
        organization={organization.data}
        organizationEtag={organization.etag}
        profile={profile.data}
        profileEtag={profile.etag}
        legal={legal.data}
        legalEtag={legal.etag}
      />
    </PageFrame>
  )
}
