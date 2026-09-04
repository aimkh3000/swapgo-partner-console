// Purpose: English-only product copy for the standalone Partner Console.

const messages = {
  points: "Exchange points",
  rates: "Rates",
  support: "Support",
  guide: "API & map setup",
  reviews: "Reviews",
  settings: "Settings",
  active: "Active",
  paused: "Paused",
  open: "Open",
  closed: "Closed",
  empty: "Nothing here yet.",
  tickets: "Tickets",
  newTicket: "New ticket",
  subject: "Subject",
  message: "Message",
  send: "Send",
  cancel: "Cancel",
  save: "Save",
  buyingRate: "Buying rate",
  sellingRate: "Selling rate",
  pointEmpty: "No points yet. Create your first exchange point.",
  pauseAction: "Pause",
  resumeAction: "Resume",
} as const

export function dictionary() {
  return messages
}
