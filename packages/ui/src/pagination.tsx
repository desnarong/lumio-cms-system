import { useT } from './i18n.js';
import { cn } from './cn.js';

export interface PaginationLabels {
  previous: string;
  next: string;
}

export interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  siblingCount?: number;
  labels?: PaginationLabels;
  className?: string;
}

const ELLIPSIS = '…';

const buildRange = (
  page: number,
  totalPages: number,
  siblingCount: number,
): (number | string)[] => {
  const totalSlots = siblingCount * 2 + 5;
  if (totalPages <= totalSlots) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const left = Math.max(2, page - siblingCount);
  const right = Math.min(totalPages - 1, page + siblingCount);
  const range: (number | string)[] = [1];

  if (left > 2) {
    range.push(ELLIPSIS);
  }
  for (let current = left; current <= right; current += 1) {
    range.push(current);
  }
  if (right < totalPages - 1) {
    range.push(ELLIPSIS);
  }
  range.push(totalPages);
  return range;
};

export const Pagination = ({
  page,
  totalPages,
  onChange,
  siblingCount = 1,
  labels,
  className,
}: PaginationProps) => {
  const t = useT();
  const shown = labels ?? { previous: t('pagination.previous'), next: t('pagination.next') };

  if (totalPages <= 1) {
    return null;
  }

  const items = buildRange(page, totalPages, siblingCount);

  return (
    <nav className={cn('ui-pagination', className)} aria-label={t('pagination.label')}>
      <button
        type="button"
        className="ui-pagination__button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        {shown.previous}
      </button>
      {items.map((item, index) =>
        typeof item === 'number' ? (
          <button
            key={item}
            type="button"
            className={cn(
              'ui-pagination__button',
              item === page && 'ui-pagination__button--active',
            )}
            aria-current={item === page ? 'page' : undefined}
            onClick={() => onChange(item)}
          >
            {item}
          </button>
        ) : (
          <span key={`${item}-${index}`} className="ui-pagination__ellipsis" aria-hidden="true">
            {item}
          </span>
        ),
      )}
      <button
        type="button"
        className="ui-pagination__button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        {shown.next}
      </button>
    </nav>
  );
};
