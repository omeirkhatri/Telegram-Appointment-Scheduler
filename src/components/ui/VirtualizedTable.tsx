'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { forwardRef, useMemo, useRef } from 'react';
import { SkeletonTable } from './SkeletonLoader';

export interface VirtualizedTableColumn<T> {
  key: string;
  header: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  render: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface VirtualizedTableProps<T> {
  data: T[];
  columns: VirtualizedTableColumn<T>[];
  height?: number;
  itemHeight?: number;
  className?: string;
  headerClassName?: string;
  rowClassName?: string;
  emptyMessage?: string;
  loading?: boolean;
  loadingMessage?: string;
  onRowClick?: (item: T, index: number) => void;
  getRowKey?: (item: T, index: number) => string;
  overscan?: number;
  enableKeyboardNavigation?: boolean;
}

export function VirtualizedTable<T>({
  data,
  columns,
  height = 400,
  itemHeight = 60,
  className = '',
  headerClassName = '',
  rowClassName = '',
  emptyMessage = 'No data available',
  loading = false,
  loadingMessage: _loadingMessage = 'Loading...',
  onRowClick,
  getRowKey = (_, index) => index.toString(),
  overscan = 5,
  enableKeyboardNavigation = true,
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Calculate total width based on column widths
  const totalWidth = useMemo(() => {
    return columns.reduce((sum, col) => sum + (col.width || 200), 0);
  }, [columns]);

  // Create virtualizer
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan,
  });

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (!enableKeyboardNavigation) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (onRowClick) {
          onRowClick(data[index], index);
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        const nextIndex = Math.min(index + 1, data.length - 1);
        const nextElement = parentRef.current?.querySelector(`[data-index="${nextIndex}"]`) as HTMLElement;
        nextElement?.focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        const prevIndex = Math.max(index - 1, 0);
        const prevElement = parentRef.current?.querySelector(`[data-index="${prevIndex}"]`) as HTMLElement;
        prevElement?.focus();
        break;
    }
  };

  if (loading) {
    return (
      <div className={`bg-[--card] border border-[--border] rounded-xl overflow-hidden shadow-lg p-4 ${className}`}>
        <SkeletonTable
          rows={5}
          columns={columns.length}
          rowHeight="3rem"
        />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`bg-[--card] border border-[--border] rounded-xl overflow-hidden shadow-lg ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-[--muted-foreground] text-center">
            <p className="text-lg font-medium">{emptyMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[--card] border border-[--border] rounded-xl overflow-hidden shadow-lg ${className}`}>
      {/* Table Header */}
      <div className="bg-[--muted]/50 border-b border-[--border]">
        <div className="flex w-full">
          {columns.map((column) => (
            <div
              key={column.key}
              className={`py-4 px-6 text-sm font-medium text-[--muted-foreground] ${column.className || ''} ${headerClassName}`}
              style={{
                width: `${((column.width || 200) / totalWidth) * 100}%`,
                minWidth: column.minWidth || Math.min(column.width || 200, 120),
                maxWidth: column.maxWidth,
              }}
            >
              {column.header}
            </div>
          ))}
        </div>
      </div>

      {/* Virtualized Table Body */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height, width: '100%' }}
        role="table"
        aria-label="Virtualized table"
      >
        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const item = data[virtualRow.index];
            const rowKey = getRowKey(item, virtualRow.index);

            return (
              <div
                key={rowKey}
                data-index={virtualRow.index}
                className={`flex border-b border-[--border] hover:bg-[--accent]/30 transition-colors ${
                  onRowClick ? 'cursor-pointer' : ''
                } ${rowClassName}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => onRowClick?.(item, virtualRow.index)}
                onKeyDown={(e) => handleKeyDown(e, virtualRow.index)}
                tabIndex={enableKeyboardNavigation ? 0 : -1}
                role="row"
                aria-rowindex={virtualRow.index + 1}
              >
                {columns.map((column) => (
                  <div
                    key={column.key}
                    className={`py-4 px-6 ${column.className || ''}`}
                    style={{
                      width: `${((column.width || 200) / totalWidth) * 100}%`,
                      minWidth: column.minWidth || Math.min(column.width || 200, 120),
                      maxWidth: column.maxWidth,
                    }}
                    role="cell"
                  >
                    {column.render(item, virtualRow.index)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Export a forwardRef version for cases where ref forwarding is needed
export const VirtualizedTableWithRef = forwardRef<
  HTMLDivElement,
  VirtualizedTableProps<any>
>((props, _ref) => {
  return <VirtualizedTable {...props} />;
});

VirtualizedTableWithRef.displayName = 'VirtualizedTableWithRef';
