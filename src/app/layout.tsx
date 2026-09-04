// Purpose: Root metadata and styles for the independent Partner Console product.

import type { Metadata } from "next"
import { cookies } from "next/headers"
import type { ReactNode } from "react"

import { MapProviderConfigProvider } from "@/components/MapProviderConfig"

import "./globals.css"

export const metadata: Metadata = {
  title: "SwapGo.me Partner Console",
  description: "Manage exchange points, rates and support through SwapGo.me Partner API.",
  robots: { index: false, follow: false },
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const sidebarPreference = (await cookies()).get("swapgo_partner_sidebar")?.value === "rail" ? "rail" : "full"
  return (
    <html lang="en" data-partner-sidebar-pref={sidebarPreference}>
      <body className="min-h-screen antialiased">
        <MapProviderConfigProvider>{children}</MapProviderConfigProvider>
      </body>
    </html>
  )
}
