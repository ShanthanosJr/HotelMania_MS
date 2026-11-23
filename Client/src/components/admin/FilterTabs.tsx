
interface FilterTabsProps<K extends string> {
    tabs: { key: K; label: string; count?: number }[];
    value: K;
    onChange: (k: K) => void;
    label: string;
}

/** Pill tabs with counts, used above staff tables. */
function FilterTabs<K extends string>({ tabs, value, onChange, label }: FilterTabsProps<K>) {
    return (
        <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label={label}>
            {tabs.map(t => (
                <button key={t.key} type="button" role="tab" aria-selected={value === t.key} onClick={() => onChange(t.key)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-colors cursor-pointer ${value === t.key
                        ? 'bg-bronze text-white dark:bg-gold dark:text-night'
                        : 'bg-white text-umber ring-1 ring-stone hover:ring-bronze dark:bg-charcoal dark:text-cream dark:ring-graphite'}`}>
                    {t.label}{t.count !== undefined && <span className="ml-1.5 opacity-70">{t.count}</span>}
                </button>
            ))}
        </div>
    );
}

export default FilterTabs;
