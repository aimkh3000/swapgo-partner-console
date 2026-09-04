// Purpose: Keep Partner API and frontend map setup instructions beside the working console.

import { ExternalLink, KeyRound, Map, Server, ShieldCheck } from "lucide-react"
import Link from "next/link"

import MapTilerSetupForm from "@/components/MapTilerSetupForm"
import PageFrame from "@/components/PageFrame"
import PartnerTwoColumnLayout from "@/components/PartnerTwoColumnLayout"

const codeClass = "overflow-x-auto rounded-lg bg-slate-800 px-4 py-3 text-[11px] leading-5 text-slate-100"

function ApiGuide() {
  return (
    <div className="space-y-5">
      <section className="max-w-[820px] space-y-2">
        <div className="flex items-center gap-2 text-[14px] font-semibold text-slate-700"><Server className="h-4 w-4 text-teal-700" />Use a server-side adapter</div>
        <p className="text-[13px] leading-6 text-slate-500">Call SwapGo.me from your backend or a same-origin BFF. Never put the Partner API key in browser JavaScript, localStorage, source maps, logs, or analytics.</p>
        <pre className={codeClass}>{`GET https://swapgo.me/api/partner/references/locations/search?q=kyiv&locale=en
GET https://swapgo.me/api/partner/references/currencies/search?q=usd&locale=en
Authorization: Bearer sgp_live_…`}</pre>
      </section>
      <section className="grid max-w-[920px] gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-700"><KeyRound className="h-4 w-4 text-cyan-700" />Writes</div>
          <p className="mt-2 text-[12px] leading-5 text-slate-500">Send a unique <code>Idempotency-Key</code> with every mutation. Resource edits and status changes use that resource&apos;s ETag in <code>If-Match</code>; point-direction assignments use the selected scope ETag. A rate batch instead carries <code>expected_updated_at</code> for every item.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-700"><ShieldCheck className="h-4 w-4 text-emerald-700" />Canonical references</div>
          <p className="mt-2 text-[12px] leading-5 text-slate-500">Store the city slug, Wikidata IDs, ISO3 country code, currency code and currency type returned by SwapGo.me. Do not invent or transform these identifiers.</p>
        </div>
      </section>
      <section className="max-w-[820px] space-y-2">
        <div className="text-[13px] font-semibold text-slate-700">Point creation flow</div>
        <ol className="list-decimal space-y-1 pl-5 text-[12px] leading-5 text-slate-500">
          <li>Search a canonical city through the SwapGo.me reference endpoint.</li>
          <li>Optionally let the operator select exact coordinates on your own map.</li>
          <li>Send the untouched canonical city fields to <code>POST /api/partner/points</code>. If coordinates were selected, send both latitude and longitude; never send only one.</li>
          <li>Assign existing organization directions when creating the point, or update assignments later.</li>
        </ol>
      </section>
      <section className="max-w-[820px] space-y-2">
        <div className="text-[13px] font-semibold text-slate-700">Reviews</div>
        <p className="text-[12px] leading-5 text-slate-500">Read the server-paginated organization feed from <code>GET /api/partner/reviews</code>. Filter by canonical city/country, point, tone, answer state and date before pagination. Reply with <code>PATCH /api/partner/reviews/{`{review_id}`}/reply</code> using the latest ETag as <code>If-Match</code> and a unique <code>Idempotency-Key</code>. Reviewer Telegram IDs are never exposed.</p>
      </section>
      <section className="max-w-[820px] rounded-xl border border-slate-200 bg-slate-50 p-4 text-[12px] leading-5 text-slate-500">
        This console is a focused reference client for points, directions, rates, assignments, reviews, tickets, and notifications. It does not expose every Partner API resource; use the SwapGo.me organization documentation for the full organization, profile, legal-data, document, and batch-rate contracts.
      </section>
    </div>
  )
}

function MapGuide() {
  return (
    <div className="space-y-5">
      <MapTilerSetupForm />
      <section className="max-w-[840px] rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-[12px] leading-5 text-slate-600">
        The repository includes a shared MapTiler browser key in <code>.env.example</code>, so maps work after the documented setup. Replacing it with your own key is recommended because its limits are shared by every console installation.
      </section>
      <section className="max-w-[840px] space-y-3">
        <div className="text-[14px] font-semibold text-slate-700">Get and connect a MapTiler key</div>
        <ol className="grid gap-2 text-[12px] leading-5 text-slate-500 sm:grid-cols-2">
          <li className="rounded-lg bg-slate-50 p-3">
            <span className="mr-2 text-slate-400">1.</span>
            <a href="https://cloud.maptiler.com/account/" target="_blank" rel="noreferrer" className="font-medium text-teal-700 hover:text-teal-800">Create a MapTiler account or sign in <ExternalLink className="ml-1 inline h-3 w-3" /></a>
          </li>
          <li className="rounded-lg bg-slate-50 p-3">
            <span className="mr-2 text-slate-400">2.</span>
            Open <a href="https://cloud.maptiler.com/account/keys/" target="_blank" rel="noreferrer" className="font-medium text-teal-700 hover:text-teal-800">API keys <ExternalLink className="ml-1 inline h-3 w-3" /></a> and create a browser key, or use an existing one.
          </li>
          <li className="rounded-lg bg-slate-50 p-3">
            <span className="mr-2 text-slate-400">3.</span>
            Add your website domains under <span className="font-medium text-slate-600">Allowed HTTP origins</span>. Add <code>localhost:3100</code> for local testing.
          </li>
          <li className="rounded-lg bg-slate-50 p-3">
            <span className="mr-2 text-slate-400">4.</span>
            Copy the key, paste it into <span className="font-medium text-slate-600">Connect MapTiler</span> above, and click <span className="font-medium text-slate-600">Connect</span>.
          </li>
        </ol>
      </section>
      <section className="max-w-[840px] space-y-2">
        <div className="flex items-center gap-2 text-[14px] font-semibold text-slate-700"><Map className="h-4 w-4 text-emerald-700" />MapLibre belongs to your frontend</div>
        <p className="text-[13px] leading-6 text-slate-500">SwapGo.me does not provide map tiles, styles, layers, an iframe picker, or map zoom rules. Install MapLibre GL JS in your application and connect a tile provider such as MapTiler under your own account.</p>
        <pre className={codeClass}>{`npm install maplibre-gl

import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const map = new maplibregl.Map({
  container: "map",
  style: "https://api.maptiler.com/maps/streets-v2/style.json?key=YOUR_MAPTILER_KEY",
  center: [city.longitude, city.latitude],
  zoom: 10
});

map.on("click", ({ lngLat }) => {
  form.latitude = lngLat.lat;
  form.longitude = lngLat.lng;
});`}</pre>
      </section>
      <section className="max-w-[840px] rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-[12px] leading-5 text-slate-600">
        A MapTiler browser key is necessarily visible to users. For real use, replace the included shared key with your own key and restrict it to your origins. It is not the SwapGo.me Partner API key.
      </section>
      <section className="max-w-[840px] space-y-2">
        <div className="text-[13px] font-semibold text-slate-700">What still comes from SwapGo.me</div>
        <p className="text-[12px] leading-5 text-slate-500">Use SwapGo.me location search for the city slug, ISO3 and canonical names. Use your map provider for visual presentation, including country bounds; a selected country must be framed from that country, never inferred from the distribution of your exchange points. MapLibre displays the result and lets the operator choose coordinates. Your server then sends the combined point payload to Partner API.</p>
        <a href="https://maplibre.org/maplibre-gl-js/docs/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-teal-700 hover:text-teal-800">MapLibre GL JS documentation <ExternalLink className="h-3.5 w-3.5" /></a>
      </section>
    </div>
  )
}

export default async function GuidePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const tab = params.tab === "map" ? "map" : "api"
  return (
    <PageFrame title="API & map setup" contained>
      <div className="flex h-full min-h-0 flex-col lg:hidden">
        <div className="mb-3 flex shrink-0 items-center justify-center gap-1 border-b border-slate-200">
          <Link href="/guide?tab=api" className={`border-b-2 px-3 py-2.5 text-[12px] font-medium sm:px-4 sm:text-[13px] ${tab === "api" ? "border-teal-700 text-slate-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>Partner API</Link>
          <Link href="/guide?tab=map" className={`border-b-2 px-3 py-2.5 text-[12px] font-medium sm:px-4 sm:text-[13px] ${tab === "map" ? "border-teal-700 text-slate-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>MapLibre + MapTiler</Link>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-2">
          {tab === "map" ? <MapGuide /> : <ApiGuide />}
        </div>
      </div>
      <div className="hidden h-full min-h-0 lg:block">
        <PartnerTwoColumnLayout
          left={<div><h2 className="mb-4 text-[15px] font-semibold text-slate-700">Partner API</h2><ApiGuide /></div>}
          right={<div><h2 className="mb-4 text-[15px] font-semibold text-slate-700">MapLibre + MapTiler</h2><MapGuide /></div>}
        />
      </div>
    </PageFrame>
  )
}
