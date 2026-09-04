// Purpose: Render URL-owned server pagination shared by Partner Console lists.

import Link from "next/link"

import { searchParamsFromRaw, setPageParam, type RawSearchParams } from "@/lib/server-pagination"

function pageHref(
  pathname: string,
  searchParams: URLSearchParams,
  pageParam: string,
  page: number,
) {
  const next = new URLSearchParams(searchParams)
  setPageParam(next, pageParam, page)
  const query = next.toString()
  return query ? `${pathname}?${query}` : pathname
}

function visiblePages(currentPage: number, totalPages: number) {
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])
  return [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b)
}

export default function ServerPagination({
  pathname,
  rawSearchParams,
  currentPage,
  totalCount,
  pageSize,
  pageParam = "page",
}: {
  pathname: string
  rawSearchParams: RawSearchParams
  currentPage: number
  totalCount: number
  pageSize: number
  pageParam?: string
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  if (totalPages <= 1) return null

  const searchParams = searchParamsFromRaw(rawSearchParams)
  const pages = visiblePages(currentPage, totalPages)

  return (
    <nav aria-label="Pagination" className="mt-3 flex flex-wrap items-center justify-center gap-1 border-t border-slate-100 pt-3">
      <Link
        aria-disabled={currentPage <= 1}
        href={pageHref(pathname, searchParams, pageParam, Math.max(1, currentPage - 1))}
        className={`inline-flex h-8 items-center rounded-md px-2.5 text-[11px] ${currentPage <= 1 ? "pointer-events-none text-slate-300" : "text-slate-500 hover:bg-slate-100"}`}
      >
        Previous
      </Link>
      {pages.map((page, index) => (
        <span key={page} className="contents">
          {index > 0 && page - pages[index - 1] > 1 ? <span className="px-1 text-[11px] text-slate-300">…</span> : null}
          <Link
            href={pageHref(pathname, searchParams, pageParam, page)}
            aria-current={page === currentPage ? "page" : undefined}
            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-[11px] ${page === currentPage ? "bg-teal-700 text-white" : "text-slate-500 hover:bg-slate-100"}`}
          >
            {page}
          </Link>
        </span>
      ))}
      <Link
        aria-disabled={currentPage >= totalPages}
        href={pageHref(pathname, searchParams, pageParam, Math.min(totalPages, currentPage + 1))}
        className={`inline-flex h-8 items-center rounded-md px-2.5 text-[11px] ${currentPage >= totalPages ? "pointer-events-none text-slate-300" : "text-slate-500 hover:bg-slate-100"}`}
      >
        Next
      </Link>
    </nav>
  )
}
