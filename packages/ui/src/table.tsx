import { useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from './cn.js';
import { EmptyState } from './empty-state.js';
import { Input } from './input.js';
import { Skeleton } from './skeleton.js';

export type SortDirection = 'asc' | 'desc';

export interface Column<Row> {
  key: string;
  header: ReactNode;
  render?: (row: Row) => ReactNode;
  /** Plain value used for sorting and search. */
  value?: (row: Row) => string | number;
  sortable?: boolean;
  align?: 'start' | 'center' | 'end';
  width?: string;
}

export interface DataTableProps<Row> {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  caption?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  loading?: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  emptyTitle?: ReactNode;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
  className?: string;
}

const alignClass = (align: Column<unknown>['align']): string | false =>
  align && align !== 'start' ? `ui-table__cell--${align}` : false;

/** Data table with search, click-to-sort and the four required states. */
export const DataTable = <Row,>({
  columns,
  rows,
  rowKey,
  caption,
  searchable = false,
  searchPlaceholder = 'ค้นหา…',
  loading = false,
  error,
  onRetry,
  emptyTitle = 'ยังไม่มีข้อมูล',
  emptyDescription,
  emptyAction,
  className,
}: DataTableProps<Row>) => {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: string; direction: SortDirection } | null>(null);

  const cellValue = (row: Row, column: Column<Row>): string | number => {
    if (column.value) {
      return column.value(row);
    }
    const raw = (row as Record<string, unknown>)[column.key];
    return typeof raw === 'number' || typeof raw === 'string' ? raw : '';
  };

  const filtered = query
    ? rows.filter((row) =>
        columns.some((column) =>
          String(cellValue(row, column)).toLowerCase().includes(query.toLowerCase()),
        ),
      )
    : rows;

  const sorted = sort
    ? [...filtered].sort((a, b) => {
        const column = columns.find((item) => item.key === sort.key);
        if (!column) {
          return 0;
        }
        const left = cellValue(a, column);
        const right = cellValue(b, column);
        const result =
          typeof left === 'number' && typeof right === 'number'
            ? left - right
            : String(left).localeCompare(String(right), 'th');
        return sort.direction === 'asc' ? result : -result;
      })
    : filtered;

  const toggleSort = (column: Column<Row>) => {
    if (!column.sortable) {
      return;
    }
    setSort((current) => {
      if (current?.key !== column.key) {
        return { key: column.key, direction: 'asc' };
      }
      return { key: column.key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  return (
    <div className={cn('ui-table', className)}>
      {searchable ? (
        <div className="ui-table__toolbar">
          <Input
            type="search"
            className="ui-table__search"
            placeholder={searchPlaceholder}
            value={query}
            aria-label={searchPlaceholder}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      ) : null}

      {loading ? (
        <div className="ui-table__loading">
          <Skeleton shape="text" lines={4} />
        </div>
      ) : error ? (
        <EmptyState
          tone="error"
          title={error}
          description="ลองอีกครั้งได้เลย ข้อมูลของคุณยังอยู่ครบ"
          action={
            onRetry ? (
              <button
                type="button"
                className="ui-button ui-button--secondary ui-button--sm"
                onClick={onRetry}
              >
                ลองใหม่
              </button>
            ) : null
          }
        />
      ) : sorted.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      ) : (
        <table className="ui-table__element">
          {caption ? <caption className="ui-table__caption">{caption}</caption> : null}
          <thead>
            <tr>
              {columns.map((column) => {
                const isSorted = sort?.key === column.key;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn('ui-table__cell', alignClass(column.align))}
                    style={column.width ? { width: column.width } : undefined}
                    aria-sort={
                      isSorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        className="ui-table__sort"
                        onClick={() => toggleSort(column)}
                      >
                        {column.header}
                        <span className="ui-table__sort-icon" aria-hidden="true">
                          {isSorted ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={rowKey(row)} className="ui-table__row">
                {columns.map((column) => (
                  <td key={column.key} className={cn('ui-table__cell', alignClass(column.align))}>
                    {column.render ? column.render(row) : cellValue(row, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
