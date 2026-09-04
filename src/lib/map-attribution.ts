// Purpose: Keep required map credits accessible without covering the partner map.

export function addPartnerMapAttribution(container: HTMLElement) {
  const wrapper = document.createElement("div")
  wrapper.style.position = "absolute"
  wrapper.style.bottom = "8px"
  wrapper.style.left = "8px"
  wrapper.style.zIndex = "20"

  const button = document.createElement("button")
  button.type = "button"
  button.textContent = "ⓘ"
  button.setAttribute("aria-label", "Show map attribution")
  button.setAttribute("aria-expanded", "false")
  button.style.display = "grid"
  button.style.width = "24px"
  button.style.height = "24px"
  button.style.placeItems = "center"
  button.style.padding = "0"
  button.style.border = "1px solid #cbd5e1"
  button.style.borderRadius = "9999px"
  button.style.background = "rgba(255, 255, 255, 0.94)"
  button.style.color = "#475569"
  button.style.fontSize = "15px"
  button.style.lineHeight = "1"
  button.style.cursor = "pointer"

  const credits = document.createElement("div")
  credits.setAttribute("role", "dialog")
  credits.setAttribute("aria-label", "Map attribution")
  credits.style.position = "absolute"
  credits.style.bottom = "0"
  credits.style.left = "30px"
  credits.style.display = "none"
  credits.style.width = "max-content"
  credits.style.maxWidth = "min(300px, calc(100vw - 40px))"
  credits.style.padding = "5px 8px"
  credits.style.border = "1px solid #cbd5e1"
  credits.style.borderRadius = "7px"
  credits.style.background = "rgba(255, 255, 255, 0.97)"
  credits.style.color = "#475569"
  credits.style.fontSize = "10px"
  credits.style.lineHeight = "1.35"

  const addLink = (label: string, href: string) => {
    const link = document.createElement("a")
    link.textContent = label
    link.href = href
    link.target = "_blank"
    link.rel = "noopener noreferrer"
    link.style.color = "#0369a1"
    link.style.textDecoration = "none"
    credits.appendChild(link)
  }
  addLink("© MapTiler", "https://www.maptiler.com/copyright/")
  credits.append(" · ")
  addLink("© OpenStreetMap contributors", "https://www.openstreetmap.org/copyright")

  const setOpen = (open: boolean) => {
    credits.style.display = open ? "block" : "none"
    button.setAttribute("aria-expanded", String(open))
  }
  const toggle = () => setOpen(button.getAttribute("aria-expanded") !== "true")
  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape") setOpen(false)
  }

  button.addEventListener("click", toggle)
  document.addEventListener("keydown", closeOnEscape)
  wrapper.append(button, credits)
  container.appendChild(wrapper)

  return () => {
    button.removeEventListener("click", toggle)
    document.removeEventListener("keydown", closeOnEscape)
    wrapper.remove()
  }
}
