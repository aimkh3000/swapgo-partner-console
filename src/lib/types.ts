// Purpose: Partner API response shapes used by the reference console.

export type PartnerIdentity = {
  organization_id: number
  integration_id: number
  key_prefix: string
  scopes: string[]
}

export type Organization = {
  id: number
  slug: string
  name: string
  status: "pending" | "active" | "disabled" | "deleted"
  updated_at: string
}

export type OrganizationContactType =
  | "phone"
  | "email"
  | "telegram"
  | "whatsapp"
  | "viber"
  | "signal"
  | "wechat"
  | "line"
  | "kakaotalk"
  | "zalo"
  | "skype"
  | "instagram"
  | "facebook"
  | "x"
  | "website"
  | "other"

export type OrganizationContact = {
  type: OrganizationContactType
  value: string
  label: string | null
  url: string | null
  is_primary: boolean
  note: string | null
}

export type WorkingHoursDay = {
  day: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"
  is_open: boolean
  open_time: string | null
  close_time: string | null
  note: string | null
}

export type OrganizationProfile = {
  organization_id: number
  description: string | null
  logo_url: string | null
  logo_filename: string | null
  logo_content_type: string | null
  logo_size_bytes: number | null
  contacts: { items: OrganizationContact[] } | null
  website: string | null
  working_hours: { timezone: string | null; items: WorkingHoursDay[] } | null
  note: string | null
  updated_at: string
}

export type LegalState = {
  verification_status: string | null
  legal_name: string | null
  registration_number: string | null
  registration_authority_name: string | null
  registration_lookup_url: string | null
  country_iso3: string | null
  country_name: string | null
  country_emoji: string | null
  review_comment: string | null
  submitted_at: string | null
  reviewed_at: string | null
  updated_at: string | null
}

export type LegalApplication = {
  id: number
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected" | "changes_requested" | "cancelled_by_owner"
  legal_name: string | null
  registration_number: string | null
  registration_authority_name: string | null
  registration_lookup_url: string | null
  country_iso3: string | null
  country_name: string | null
  country_emoji: string | null
  owner_note: string | null
  review_comment: string | null
  changed_fields: string[]
  material_changed: boolean
  documents_required: boolean
  submitted_at: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export type LegalDocument = {
  id: number
  application_id: number | null
  document_type: "company_registration" | "license" | "owner_identity" | "address_proof" | "logo" | "other"
  original_filename: string
  content_type: string | null
  size_bytes: number | null
  visibility: "private" | "public_after_approval"
  status: "uploaded" | "accepted" | "rejected" | "deleted"
  retirement_requested: boolean
  review_comment: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  content_url: string
}

export type LegalSnapshot = {
  updated_at: string
  current: LegalState
  application: LegalApplication | null
  current_documents: LegalDocument[]
  application_documents: LegalDocument[]
}

export type CurrencyReference = {
  code: string
  type: string
  name: string
  short: string | null
  emoji: string | null
}

export type LocationReference = {
  kind: "country" | "city"
  name: string
  wikidata_id: string
  slug: string | null
  iso3: string
  country_wikidata_id: string
  country_name: string | null
  country_emoji: string | null
  latitude: number | null
  longitude: number | null
}

export type PointLocation = {
  city_slug: string
  city_wikidata_id: string
  country_iso3: string
  country_wikidata_id: string
  latitude: number | null
  longitude: number | null
}

export type Point = {
  id: number
  name: string
  status: "active" | "disabled" | "deleted"
  direction_assignment_mode: "inherit_all" | "explicit"
  active_direction_count: number | null
  city_name: string
  country_name: string
  country_emoji: string | null
  location: PointLocation
  address: string | null
  note: string | null
  created_at: string
  updated_at: string
}

export type Rate = {
  id: number
  currency_from: CurrencyReference
  currency_to: CurrencyReference
  status: "active" | "paused" | "deleted"
  buying_rate: string | null
  selling_rate: string | null
  comment: string | null
  updated_at: string
}

export type TicketSummary = {
  id: number
  subject: string
  status: "open" | "closed"
  last_side: "organization" | "admin"
  message_count: number
  last_message_preview: string
  created_at: string
  updated_at: string
}

type TicketMessage = {
  id: number
  side: "organization" | "admin"
  body: string
  created_at: string
}

export type TicketDetail = Omit<TicketSummary, "last_message_preview"> & {
  messages: TicketMessage[]
  message_total: number
  message_limit: number
  message_offset: number
}

export type Notification = {
  id: number
  subject: string
  body: string
  created_at: string
}

export type ReviewSummary = {
  total: number
  unanswered: number
  positive: number
  neutral: number
  negative: number
}

export type Review = {
  id: number
  point_id: number
  rating: -1 | 0 | 1
  tone: "positive" | "neutral" | "negative"
  comment: string | null
  reply: string | null
  replied_at: string | null
  reply_edited_at: string | null
  point_name: string | null
  point_address: string | null
  latitude: number | null
  longitude: number | null
  city_slug: string | null
  city_name: string | null
  country_iso3: string | null
  country_name: string | null
  country_emoji: string | null
  status: "active" | "hidden" | "deleted"
  created_at: string
  updated_at: string
}

export type ReviewPage = Page<Review> & {
  summary: ReviewSummary
  organization_summary: ReviewSummary
}

type DirectionAssignment = {
  direction_id: number
  currency_from: CurrencyReference
  currency_to: CurrencyReference
  direction_status: "active" | "paused" | "deleted"
  enabled_points_count: number
  total_points_count: number
}

export type DirectionAssignmentPage = {
  items: DirectionAssignment[]
  total_direction_count: number
  limit: number
  offset: number
  total_points_count: number
  inherit_all_points_count: number
  explicit_points_count: number
  scope_revision: string
}

export type Page<T> = {
  items: T[]
  total_count: number
  limit: number
  offset: number
}
