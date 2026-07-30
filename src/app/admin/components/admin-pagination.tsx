import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

type AdminPaginationProps = {
  page: number
  totalPages: number
  total: number
  createPageHref: (page: number) => string
}

function getVisiblePages(page: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (page <= 3) {
    return [1, 2, 3, 4]
  }

  if (page >= totalPages - 2) {
    return [totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  }

  return [page - 1, page, page + 1]
}

export default function AdminPagination({ page, totalPages, total, createPageHref }: AdminPaginationProps) {
  if (totalPages <= 1) {
    return total > 0 ? <div className="text-sm text-slate-500">共 {total} 条</div> : null
  }

  const pages = getVisiblePages(page, totalPages)
  const showLeadingEllipsis = pages[0] > 2
  const showTrailingEllipsis = pages[pages.length - 1] < totalPages - 1

  return (
    <div className="mt-4 flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
      <div className="text-sm text-slate-500">共 {total} 条</div>
      <Pagination className="mx-0 w-auto justify-start md:justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href={createPageHref(page - 1)}
              aria-disabled={page <= 1}
              className={page <= 1 ? 'pointer-events-none opacity-50' : undefined}
            />
          </PaginationItem>

          {pages[0] > 1 && (
            <PaginationItem>
              <PaginationLink href={createPageHref(1)} isActive={page === 1}>
                1
              </PaginationLink>
            </PaginationItem>
          )}

          {showLeadingEllipsis && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}

          {pages.map((pageNumber) => (
            <PaginationItem key={pageNumber}>
              <PaginationLink href={createPageHref(pageNumber)} isActive={pageNumber === page}>
                {pageNumber}
              </PaginationLink>
            </PaginationItem>
          ))}

          {showTrailingEllipsis && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}

          {pages[pages.length - 1] < totalPages && (
            <PaginationItem>
              <PaginationLink href={createPageHref(totalPages)} isActive={page === totalPages}>
                {totalPages}
              </PaginationLink>
            </PaginationItem>
          )}

          <PaginationItem>
            <PaginationNext
              href={createPageHref(page + 1)}
              aria-disabled={page >= totalPages}
              className={page >= totalPages ? 'pointer-events-none opacity-50' : undefined}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
