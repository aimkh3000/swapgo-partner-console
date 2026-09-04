// Purpose: Keep contact-channel selection consistent with the organization UI.

import SelectDropdown from "@/components/SelectDropdown"
import type { OrganizationContactType } from "@/lib/types"

const OPTIONS: Array<{ value: OrganizationContactType; label: string; example: string }> = [
  { value: "phone", label: "Phone", example: "+1 212 555 0123" },
  { value: "email", label: "Email", example: "contact@example.com" },
  { value: "telegram", label: "Telegram", example: "@username" },
  { value: "whatsapp", label: "WhatsApp", example: "+1 212 555 0123" },
  { value: "viber", label: "Viber", example: "+1 212 555 0123" },
  { value: "signal", label: "Signal", example: "+1 212 555 0123" },
  { value: "wechat", label: "WeChat", example: "WeChat ID" },
  { value: "line", label: "LINE", example: "LINE ID" },
  { value: "kakaotalk", label: "KakaoTalk", example: "KakaoTalk ID" },
  { value: "zalo", label: "Zalo", example: "+84 …" },
  { value: "skype", label: "Skype", example: "live:username" },
  { value: "instagram", label: "Instagram", example: "@username" },
  { value: "facebook", label: "Facebook", example: "Profile or page URL" },
  { value: "x", label: "X", example: "@username" },
  { value: "website", label: "Website", example: "https://example.com" },
  { value: "other", label: "Other", example: "Custom contact" },
]

export default function ContactTypeDropdown({
  value,
  onChange,
}: {
  value: OrganizationContactType
  onChange: (value: OrganizationContactType) => void
}) {
  return <SelectDropdown value={value} options={OPTIONS.map(({ value: optionValue, label, example }) => ({ value: optionValue, label, description: example }))} onChange={onChange} ariaLabel="Contact type" minimumMenuWidth={230} />
}
