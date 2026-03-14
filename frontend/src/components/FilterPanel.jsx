import './FilterPanel.css';

const SORT_OPTIONS = [
  { value: 'newest', label: '🕐 Newest First' },
  { value: 'price_asc', label: '💰 Price: Low → High' },
  { value: 'price_desc', label: '💰 Price: High → Low' },
  { value: 'name_asc', label: '🔤 Name: A → Z' },
  { value: 'stock_desc', label: '📦 Most Available' },
];

export default function FilterPanel({ filters, onChange, total, priceRange }) {
  const { sort, minPrice, maxPrice, inStock } = filters;

  const set = (key, val) => onChange({ ...filters, [key]: val });

  const activeChips = [];
  if (inStock) activeChips.push({ label: 'In Stock Only', key: 'inStock', clear: () => set('inStock', false) });
  if (minPrice) activeChips.push({ label: `Min ₹${minPrice}`, key: 'minPrice', clear: () => set('minPrice', '') });
  if (maxPrice) activeChips.push({ label: `Max ₹${maxPrice}`, key: 'maxPrice', clear: () => set('maxPrice', '') });
  if (sort && sort !== 'newest') {
    const label = SORT_OPTIONS.find((o) => o.value === sort)?.label || sort;
    activeChips.push({ label, key: 'sort', clear: () => set('sort', 'newest') });
  }

  const clearAll = () => onChange({ sort: 'newest', minPrice: '', maxPrice: '', inStock: false });

  return (
    <div>
      <div className="filter-bar">
        <span className="filter-label">Filter</span>

        {/* Sort */}
        <div className="filter-group">
          <select
            className="filter-select"
            value={sort}
            onChange={(e) => set('sort', e.target.value)}
            id="filter-sort"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Price Range */}
        <div className="price-range-wrap">
          <span>₹</span>
          <input
            type="number"
            className="price-input"
            placeholder={priceRange?.min ?? '0'}
            value={minPrice}
            min="0"
            onChange={(e) => set('minPrice', e.target.value)}
            id="filter-min-price"
          />
          <span className="price-sep">—</span>
          <input
            type="number"
            className="price-input"
            placeholder={priceRange?.max ?? '1000'}
            value={maxPrice}
            min="0"
            onChange={(e) => set('maxPrice', e.target.value)}
            id="filter-max-price"
          />
        </div>

        {/* In Stock toggle */}
        <button
          className={`filter-toggle ${inStock ? 'active' : ''}`}
          onClick={() => set('inStock', !inStock)}
          id="filter-in-stock"
        >
          {inStock ? '✅' : '☐'} In Stock Only
        </button>

        {/* Clear all */}
        {activeChips.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={clearAll}>✕ Clear all</button>
        )}
      </div>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="active-filters">
          {activeChips.map((chip) => (
            <span key={chip.key} className="active-filter-chip">
              {chip.label}
              <button onClick={chip.clear} title="Remove filter">✕</button>
            </span>
          ))}
        </div>
      )}

      {/* Results count */}
      {total !== undefined && (
        <div className="results-bar">
          <p>Showing <span className="results-count"><span>{total}</span> item{total !== 1 ? 's' : ''}</span></p>
        </div>
      )}
    </div>
  );
}
