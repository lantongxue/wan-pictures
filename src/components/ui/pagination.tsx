import * as React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { buttonVariants, type ButtonProps } from './button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

/* ------------------------------------------------------------------ */
/* shadcn/ui Pagination primitives                                    */
/* ------------------------------------------------------------------ */

const Pagination = ({ className, ...props }: React.ComponentProps<'nav'>) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn('mx-auto flex w-full justify-center', className)}
    {...props}
  />
);
Pagination.displayName = 'Pagination';

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<'ul'>
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn('flex flex-row items-center gap-1', className)}
    {...props}
  />
));
PaginationContent.displayName = 'PaginationContent';

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<'li'>
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn('', className)} {...props} />
));
PaginationItem.displayName = 'PaginationItem';

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<ButtonProps, 'size'> &
  React.ComponentProps<'button'>;

/**
 * Adapted from shadcn/ui. The official PaginationLink renders an <a> for
 * route-based pagination; here pagination is pure client-side state, so the
 * underlying element is a <button> to avoid triggering a full page reload.
 */
const PaginationLink = ({
  className,
  isActive,
  size = 'sm',
  ...props
}: PaginationLinkProps) => (
  <button
    aria-current={isActive ? 'page' : undefined}
    className={cn(
      buttonVariants({
        variant: isActive ? 'default' : 'ghost',
        size,
      }),
      'min-w-8',
      className
    )}
    {...props}
  />
);
PaginationLink.displayName = 'PaginationLink';

const PaginationPrevious = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => {
  const { t } = useTranslation();
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="sm"
      className={cn('gap-1 pl-2.5', className)}
      {...props}
    >
      <ChevronLeft className="h-4 w-4" />
      <span>{t('pagination.prev')}</span>
    </PaginationLink>
  );
};
PaginationPrevious.displayName = 'PaginationPrevious';

const PaginationNext = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => {
  const { t } = useTranslation();
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="sm"
      className={cn('gap-1 pr-2.5', className)}
      {...props}
    >
      <span>{t('pagination.next')}</span>
      <ChevronRight className="h-4 w-4" />
    </PaginationLink>
  );
};
PaginationNext.displayName = 'PaginationNext';

const PaginationEllipsis = ({
  className,
  ...props
}: React.ComponentProps<'span'>) => {
  const { t } = useTranslation();
  return (
    <span
      aria-hidden
      className={cn('flex h-9 w-9 items-center justify-center', className)}
      {...props}
    >
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">{t('pagination.ellipsis')}</span>
    </span>
  );
};
PaginationEllipsis.displayName = 'PaginationEllipsis';

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};

/* ------------------------------------------------------------------ */
/* Paginator — convenience composition built on the primitives above  */
/* Keeps the record-count text + page-size selector used by the admin */
/* pages, while delegating the page list / prev / next / ellipsis to  */
/* the official Pagination primitives.                                */
/* ------------------------------------------------------------------ */

export interface PaginatorProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export const Paginator: React.FC<PaginatorProps> = ({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}) => {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  // Build a compact page list with ellipsis gaps
  const items: (number | '…')[] = [];
  const window = 2;
  const rawPages: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - window && i <= page + window)) {
      rawPages.push(i);
    }
  }
  let prev = 0;
  for (const p of rawPages) {
    if (p - prev > 1) items.push('…');
    items.push(p);
    prev = p;
  }

  return (
    <Pagination className="mx-0 flex-wrap items-center justify-between gap-3 pt-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          {t('pagination.summary', { total, from, to, pages: totalPages })}
        </span>
        {onPageSizeChange && (
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="h-8 w-[104px] text-xs rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {t('pagination.perPage', { count: s })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            disabled={page <= 1}
            aria-disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          />
        </PaginationItem>

        {items.map((it, idx) =>
          it === '…' ? (
            <PaginationItem key={`ellipsis-${idx}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={it}>
              <PaginationLink isActive={it === page} onClick={() => onPageChange(it)}>
                {it}
              </PaginationLink>
            </PaginationItem>
          )
        )}

        <PaginationItem>
          <PaginationNext
            disabled={page >= totalPages}
            aria-disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};
