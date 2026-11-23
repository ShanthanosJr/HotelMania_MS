import React, { useMemo, useState } from 'react';
import { BsArrowDown, BsArrowUp, BsDownload, BsSearch } from 'react-icons/bs';
import { EmptyState, Skeleton } from '../ui';

export interface Column<T> {
    key: string;
    header: React.ReactNode;
    /** Cell content (defaults to row[key]). */
    render?: (row: T) => React.ReactNode;
    /** Value used for sorting and CSV export (defaults to row[key]). */
    value?: (row: T) => string | number | null | undefined;
    sortable?: boolean;
    align?: 'left' | 'right' | 'center';
    className?: string;
    /** Hide on small screens. */
    hideBelow?: 'sm' | 'md' | 'lg';
}

interface DataTableProps<T> {
    columns: Column<T>[];
    rows: T[];
    rowKey: (row: T) => string;
    loading?: boolean;
    /** Text to search per row; shows a search box when given. */
    searchText?: (row: T) => string;
    searchPlaceholder?: string;
    pageSize?: number;
    /** File name for "Export CSV"; hides the button when omitted. */
    exportName?: string;
    emptyTitle?: string;
    emptyText?: React.ReactNode;
    onRowClick?: (row: T) => void;
    toolbar?: React.ReactNode;
    initialSort?: { key: string; dir: 'asc' | 'desc' };
    rowClassName?: (row: T) => string;
}

const HIDE: Record<NonNullable<Column<unknown>['hideBelow']>, string> = {
    sm: 'hidden sm:table-cell',
    md: 'hidden md:table-cell',
    lg: 'hidden lg:table-cell',
};

const csvCell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Sortable, searchable, paginated table with CSV export. Used across the staff pages. */
function DataTable<T>({
    columns, rows, rowKey, loading, searchText, searchPlaceholder = 'Search…', pageSize = 25, exportName,
    emptyTitle = 'Nothing to show', emptyText, onRowClick, toolbar, initialSort, rowClassName,
}: DataTableProps<T>) {
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState(initialSort || null);
    const [page, setPage] = useState(0);

    const valueOf = (col: Column<T>, row: T) =>
        col.value ? col.value(row) : (row as Record<string, unknown>)[col.key] as string | number | null | undefined;

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        let list = q && searchText ? rows.filter(r => searchText(r).toLowerCase().includes(q)) : rows;
        if (sort) {
            const col = columns.find(c => c.key === sort.key);
            if (col) {
                list = [...list].sort((a, b) => {
                    const x = valueOf(col, a);
                    const y = valueOf(col, b);
                    if (x === y) return 0;
                    if (x === null || x === undefined) return 1;
                    if (y === null || y === undefined) return -1;
                    const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true });
                    return sort.dir === 'asc' ? cmp : -cmp;
                });
            }
        }
        return list;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows, query, sort, columns, searchText]);

    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const current = Math.min(page, pages - 1);
    const visible = filtered.slice(current * pageSize, current * pageSize + pageSize);

    const toggleSort = (key: string) => {
        setSort(s => (s && s.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' }));
        setPage(0);
    };

    const exportCsv = () => {
        const exportable = columns.filter(c => typeof c.header === 'string');
        const lines = [
            exportable.map(c => csvCell(c.header)).join(','),
            ...filtered.map(r => exportable.map(c => csvCell(valueOf(c, r))).join(',')),
        ];
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exportName}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const alignCls = (a?: string) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');

    return (
        <div className="overflow-hidden rounded-2xl border border-stone bg-white dark:border-graphite dark:bg-charcoal">
            {(searchText || exportName || toolbar) && (
                <div className="flex flex-wrap items-center gap-3 border-b border-stone px-4 py-3 dark:border-graphite">
                    {searchText && (
                        <label className="relative flex min-w-[220px] flex-1 items-center sm:max-w-xs">
                            <BsSearch className="pointer-events-none absolute left-3 text-taupe" aria-hidden="true" />
                            <span className="sr-only">Search</span>
                            <input type="search" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} placeholder={searchPlaceholder}
                                className="w-full rounded-lg border border-stone bg-linen py-2 pl-9 pr-3 text-sm focus:border-bronze focus:outline-none focus:ring-2 focus:ring-gold/40 dark:border-graphite dark:bg-night dark:text-cream" />
                        </label>
                    )}
                    <div className="flex flex-1 flex-wrap items-center justify-end gap-2">{toolbar}</div>
                    {exportName && (
                        <button type="button" onClick={exportCsv} disabled={!filtered.length}
                            className="inline-flex items-center gap-2 rounded-lg border border-stone px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-umber hover:border-bronze hover:text-bronze disabled:opacity-40 dark:border-graphite dark:text-cream cursor-pointer">
                            <BsDownload /> CSV
                        </button>
                    )}
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-linen text-[0.68rem] uppercase tracking-[0.14em] text-taupe dark:bg-night dark:text-gray-400">
                        <tr>
                            {columns.map(c => (
                                <th key={c.key} scope="col" className={`px-4 py-3 font-semibold ${alignCls(c.align)} ${c.hideBelow ? HIDE[c.hideBelow] : ''} ${c.className || ''}`}
                                    aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                                    {c.sortable ? (
                                        <button type="button" onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 uppercase tracking-[0.14em] hover:text-bronze cursor-pointer">
                                            {c.header}
                                            {sort?.key === c.key && (sort.dir === 'asc' ? <BsArrowUp aria-hidden="true" /> : <BsArrowDown aria-hidden="true" />)}
                                        </button>
                                    ) : c.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone dark:divide-graphite">
                        {loading && !rows.length ? (
                            [0, 1, 2, 3].map(i => (
                                <tr key={i}><td colSpan={columns.length} className="px-4 py-3"><Skeleton className="h-6" /></td></tr>
                            ))
                        ) : visible.length === 0 ? (
                            <tr><td colSpan={columns.length}><EmptyState title={query ? 'No matches' : emptyTitle} description={query ? `Nothing matches “${query}”.` : emptyText} /></td></tr>
                        ) : visible.map(row => (
                            <tr key={rowKey(row)}
                                onClick={onRowClick ? () => onRowClick(row) : undefined}
                                className={`text-ink transition-colors dark:text-cream ${onRowClick ? 'cursor-pointer hover:bg-linen dark:hover:bg-graphite/40' : ''} ${rowClassName ? rowClassName(row) : ''}`}>
                                {columns.map(c => (
                                    <td key={c.key} className={`px-4 py-3 align-middle ${alignCls(c.align)} ${c.hideBelow ? HIDE[c.hideBelow] : ''} ${c.className || ''}`}>
                                        {c.render ? c.render(row) : String(valueOf(c, row) ?? '—')}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {pages > 1 && (
                <div className="flex items-center justify-between border-t border-stone px-4 py-3 text-xs text-taupe dark:border-graphite dark:text-gray-400">
                    <span>{current * pageSize + 1}–{Math.min(filtered.length, (current + 1) * pageSize)} of {filtered.length}</span>
                    <div className="flex gap-2">
                        <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} className="rounded-md border border-stone px-3 py-1.5 disabled:opacity-40 dark:border-graphite cursor-pointer">Previous</button>
                        <button type="button" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="rounded-md border border-stone px-3 py-1.5 disabled:opacity-40 dark:border-graphite cursor-pointer">Next</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DataTable;
