import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';
import ProductCard from '../components/ProductCard';
import AddOnModal from '../components/AddOnModal';
import FilterPanel from '../components/FilterPanel';
import './Home.css';

const ALL_LIMIT = 12;   // items per fetch in infinite scroll mode
const CAT_LIMIT = 10;   // items per page in category pagination mode

/* ── Horizontal category slider ───────────────────────────────── */
function CategorySlider({ cat, items, onAddOnOpen }) {
  const rowRef = useRef(null);

  const scroll = (dir) => {
    const el = rowRef.current;
    if (!el) return;
    // Scroll by roughly 2 card widths (card ~200px + gap ~14px)
    el.scrollBy({ left: dir * 428, behavior: 'smooth' });
  };

  return (
    <section className="cat-section">
      <div className="cat-section-header">
        <h2 className="cat-section-title">
          {getCatEmoji(cat.name)} {cat.name}
          <span className="cat-count">{items.length}</span>
        </h2>
        <div className="slider-arrows">
          <button className="slider-arrow" onClick={() => scroll(-1)} aria-label="Scroll left">‹</button>
          <button className="slider-arrow" onClick={() => scroll(1)}  aria-label="Scroll right">›</button>
        </div>
      </div>
      <div className="cat-slider-row" ref={rowRef}>
        {items.map(p => (
          <div className="slider-card-wrap" key={p._id}>
            <ProductCard product={p} onAddOnOpen={onAddOnOpen} />
          </div>
        ))}
      </div>
    </section>
  );
}

const CATEGORY_EMOJIS = {
  burgers: '🍔', pizza: '🍕', drinks: '🥤', cold: '🧊',
  sides: '🍟', breads: '🍞', desserts: '🍰', breakfast: '🍳', default: '🍽️',
};
function getCatEmoji(name = '') {
  const l = name.toLowerCase();
  return Object.entries(CATEGORY_EMOJIS).find(([k]) => l.includes(k))?.[1] || CATEGORY_EMOJIS.default;
}

export default function Home() {
  const [categories,   setCategories]   = useState([]);
  const [products,     setProducts]     = useState([]);
  const [selectedCat,  setSelectedCat]  = useState(null);  // null = All Items
  const [searchQ,      setSearchQ]      = useState('');
  const [inputVal,     setInputVal]     = useState('');
  const [filters,      setFilters]      = useState({ sort: 'newest', minPrice: '', maxPrice: '', inStock: false });

  // ── Shared ────────────────────────────────────────────────────────────────
  const [loading,     setLoading]     = useState(false);
  const [initLoaded,  setInitLoaded]  = useState(false);
  const [total,       setTotal]       = useState(0);
  const [priceRange,  setPriceRange]  = useState({ min: 0, max: 1000 });
  const [selectedProduct, setSelectedProduct] = useState(null);

  // ── Infinite scroll state ─────────────────────────────────────────────────
  // scrollPage tracks which page we've fetched so far
  // hasMore tells us if there are more pages to fetch
  const [scrollPage, setScrollPage] = useState(1);
  const [hasMore,    setHasMore]    = useState(true);

  // ── Category pagination state ──────────────────────────────────────────────
  const [catPage,    setCatPage]    = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const sentinelRef    = useRef(null);   // invisible div at the bottom
  const loadingRef     = useRef(false);  // tracks loading without causing re-renders
  const searchDebounce = useRef(null);

  const isCatMode = !!selectedCat;

  // ── Build API params ───────────────────────────────────────────────────────
  const buildParams = useCallback((pg, limit) => {
    const p = { page: pg, limit, sort: filters.sort };
    if (selectedCat)      p.category  = selectedCat;
    if (filters.minPrice) p.minPrice  = filters.minPrice;
    if (filters.maxPrice) p.maxPrice  = filters.maxPrice;
    if (filters.inStock)  p.inStock   = 'true';
    return p;
  }, [selectedCat, filters]);

  // ── Fetch helpers ──────────────────────────────────────────────────────────
  const doFetch = async (pg, limit, resetList) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const params = buildParams(pg, limit);
      const endpoint = searchQ.trim() ? '/products/search' : '/products';
      if (searchQ.trim()) params.q = searchQ;
      const { data } = await api.get(endpoint, { params });
      const items = data.data || [];
      setProducts(prev => resetList ? items : [...prev, ...items]);
      setTotal(data.pagination.total);
      if (data.priceRange) setPriceRange(data.priceRange);
      return data.pagination; // return pagination so callers can use it
    } catch { return null; }
    finally {
      loadingRef.current = false;
      setLoading(false);
      setInitLoaded(true);
    }
  };

  // ── 1. Reset + initial load whenever filters / category / search change ────
  useEffect(() => {
    setProducts([]);
    setInitLoaded(false);
    if (isCatMode) {
      // Category mode: traditional pagination — reset to page 1
      setCatPage(1);
      doFetch(1, CAT_LIMIT, true).then(pag => {
        setTotalPages(pag?.pages || 1);
      });
    } else {
      // All-items mode: infinite scroll — reset to page 1
      setScrollPage(1);
      setHasMore(true);
      doFetch(1, ALL_LIMIT, true).then(pag => {
        setHasMore(1 < (pag?.pages || 1));
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCat, searchQ, filters]);

  // ── 2. IntersectionObserver — watches the hidden sentinel div ─────────────
  //
  //  HOW INFINITE SCROLL WORKS:
  //  • A <div ref={sentinelRef}> sits at the very bottom of the product list
  //  • IntersectionObserver fires every time that div enters the viewport
  //  • When it fires AND we have more pages AND we're not already loading:
  //    → increment page number → fetch next batch → append to products list
  //  • Using loadingRef (a ref, not state) means the observer callback always
  //    reads the CURRENT loading value, not a stale closure copy
  //
  useEffect(() => {
    if (isCatMode) return; // observer only active in infinite scroll mode
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingRef.current) {
          // Use a functional update to get the latest page number
          setScrollPage(prev => {
            const nextPage = prev + 1;
            // hasMore check is done via a ref twin — see hasMoreRef below
            // fetch is guarded by loadingRef so no double-fires
            doFetch(nextPage, ALL_LIMIT, false).then(pag => {
              if (pag) setHasMore(nextPage < (pag.pages || 1));
            });
            return nextPage;
          });
        }
      },
      { rootMargin: '200px', threshold: 0 } // trigger 200px BEFORE sentinel is visible
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  // Only re-attach when mode changes or hasMore changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCatMode, hasMore]);

  // ── Category pagination handlers ───────────────────────────────────────────
  const goToPage = async (pg) => {
    setCatPage(pg);
    const pag = await doFetch(pg, CAT_LIMIT, true);
    setTotalPages(pag?.pages || 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPaginationPages = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [1];
    if (catPage > 3) pages.push('...');
    for (let i = Math.max(2, catPage - 1); i <= Math.min(totalPages - 1, catPage + 1); i++) pages.push(i);
    if (catPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  // ── Categories ─────────────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data.data || []));
  }, []);

  // ── Search debounce ────────────────────────────────────────────────────────
  const handleSearchChange = (e) => {
    setInputVal(e.target.value);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => setSearchQ(e.target.value), 350);
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const isFiltered    = searchQ.trim() || filters.minPrice || filters.maxPrice || filters.inStock || filters.sort !== 'newest';
  const currentCatName = categories.find(c => c._id === selectedCat)?.name;

  // Group products by category (used only in all-items unfiltered mode)
  const productsByCategory = categories.reduce((acc, cat) => {
    const items = products.filter(p => (p.category_id?._id || p.category_id) === cat._id);
    if (items.length) acc.push({ cat, items });
    return acc;
  }, []);

  return (
    <div className="home-page">

      {/* ── Hero ── */}
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">What are you<br /><span>craving today?</span></h1>
          <div className="hero-search">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="hero-search-input"
              placeholder="Search pizza, burgers, drinks..."
              value={inputVal}
              onChange={handleSearchChange}
              id="home-search"
            />
            {inputVal && (
              <button className="search-clear" onClick={() => { setInputVal(''); setSearchQ(''); }}>✕</button>
            )}
          </div>
        </div>
        <div className="hero-floats" aria-hidden="true">
          <span className="float-item" style={{ '--d': '0s',   '--x': '10%', '--y': '20%' }}>🍔</span>
          <span className="float-item" style={{ '--d': '1.2s', '--x': '80%', '--y': '15%' }}>🍕</span>
          <span className="float-item" style={{ '--d': '0.6s', '--x': '60%', '--y': '60%' }}>🥤</span>
          <span className="float-item" style={{ '--d': '1.8s', '--x': '25%', '--y': '70%' }}>🍟</span>
        </div>
      </div>

      <div className="home-layout">
        {/* ── Sidebar ── */}
        <aside className="cat-sidebar">
          <button
            className={`cat-sidebar-item ${!selectedCat ? 'active' : ''}`}
            onClick={() => setSelectedCat(null)}
          >
            <span className="cat-icon">🍽️</span><span>All Items</span>
          </button>
          {categories.map(cat => (
            <button
              key={cat._id}
              className={`cat-sidebar-item ${selectedCat === cat._id ? 'active' : ''}`}
              onClick={() => setSelectedCat(cat._id)}
            >
              <span className="cat-icon">{getCatEmoji(cat.name)}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </aside>

        {/* ── Main ── */}
        <main className="home-main">

          {/* Mobile pills */}
          <div className="cat-pills">
            <button className={`cat-pill ${!selectedCat ? 'active' : ''}`} onClick={() => setSelectedCat(null)}>🍽️ All</button>
            {categories.map(cat => (
              <button
                key={cat._id}
                className={`cat-pill ${selectedCat === cat._id ? 'active' : ''}`}
                onClick={() => setSelectedCat(cat._id)}
              >
                {getCatEmoji(cat.name)} {cat.name}
              </button>
            ))}
          </div>

          {/* Filter panel */}
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            total={initLoaded ? total : undefined}
            priceRange={priceRange}
          />

          {/* Category heading */}
          {isCatMode && currentCatName && (
            <div className="cat-section-title" style={{ marginBottom: 16 }}>
              {getCatEmoji(currentCatName)} {currentCatName}
              <span className="cat-count">{total} item{total !== 1 ? 's' : ''}</span>
            </div>
          )}

          {/* Loading skeleton */}
          {!initLoaded && (
            <div className="products-grid">
              {Array.from({ length: isCatMode ? CAT_LIMIT : 8 }).map((_, i) => (
                <div key={i} className="product-card skeleton-card">
                  <div className="skeleton" style={{ height: 140, borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }} />
                  <div style={{ padding: 12 }}>
                    <div className="skeleton" style={{ height: 12, borderRadius: 4, marginBottom: 8 }} />
                    <div className="skeleton" style={{ height: 10, borderRadius: 4, width: '60%' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ════════════════════════════════════════════
              CATEGORY MODE — grid + numbered pagination
              ════════════════════════════════════════════ */}
          {initLoaded && isCatMode && (
            <>
              {products.length === 0 ? (
                <div className="empty-state">
                  <div className="icon">🔍</div>
                  <h3>No items found</h3>
                  <p>Try different filters or choose another category.</p>
                  <button className="btn btn-primary btn-sm" onClick={() => {
                    setFilters({ sort: 'newest', minPrice: '', maxPrice: '', inStock: false });
                    setSelectedCat(null);
                  }}>Clear All</button>
                </div>
              ) : (
                <>
                  {loading && (
                    <div style={{ textAlign: 'center', padding: '10px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                      <span className="spinner-sm" /> Loading...
                    </div>
                  )}
                  <div className={`products-grid ${loading ? 'grid-loading' : ''}`}>
                    {products.map(p => (
                      <ProductCard key={p._id} product={p} onAddOnOpen={setSelectedProduct} />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="pagination">
                      <button className="page-btn" onClick={() => goToPage(catPage - 1)} disabled={catPage === 1}>‹ Prev</button>
                      {getPaginationPages().map((pg, i) =>
                        pg === '...'
                          ? <span key={`e${i}`} className="page-ellipsis">…</span>
                          : <button key={pg} className={`page-btn ${catPage === pg ? 'active' : ''}`} onClick={() => goToPage(pg)}>{pg}</button>
                      )}
                      <button className="page-btn" onClick={() => goToPage(catPage + 1)} disabled={catPage === totalPages}>Next ›</button>
                    </div>
                  )}
                  <p className="page-info">
                    Page {catPage} of {totalPages} &middot; Showing {((catPage - 1) * CAT_LIMIT) + 1}–{Math.min(catPage * CAT_LIMIT, total)} of {total} items
                  </p>
                </>
              )}
            </>
          )}

          {/* ════════════════════════════════════════════
              ALL-ITEMS MODE — infinite scroll
              ════════════════════════════════════════════ */}
          {initLoaded && !isCatMode && (
            isFiltered ? (
              /* Flat grid for search/filtered results */
              products.length === 0 ? (
                <div className="empty-state">
                  <div className="icon">🔍</div>
                  <h3>No items found</h3>
                  <p>Try different search terms or adjust your filters.</p>
                  <button className="btn btn-primary btn-sm" onClick={() => {
                    setInputVal(''); setSearchQ('');
                    setFilters({ sort: 'newest', minPrice: '', maxPrice: '', inStock: false });
                  }}>Clear Filters</button>
                </div>
              ) : (
                <div className="products-grid">
                  {products.map(p => <ProductCard key={p._id} product={p} onAddOnOpen={setSelectedProduct} />)}
                </div>
              )
            ) : (
              /* Grouped by category (default All Items view) */
              productsByCategory.length === 0 ? (
                <div className="empty-state">
                  <div className="icon">🍽️</div>
                  <h3>No items yet</h3>
                  <p>Check back soon!</p>
                </div>
              ) : (
                productsByCategory.map(({ cat, items }) => (
                  <CategorySlider
                    key={cat._id}
                    cat={cat}
                    items={items}
                    onAddOnOpen={setSelectedProduct}
                  />
                ))
              )
            )
          )}

          {/* ── Infinite scroll sentinel & status (all-items mode only) ──────── */}
          {!isCatMode && (
            <div ref={sentinelRef} className="scroll-sentinel">
              {loading && initLoaded && (
                <div className="scroll-loading">
                  <span className="spinner-sm" />
                  <span>Loading more...</span>
                </div>
              )}
              {!hasMore && initLoaded && products.length > 0 && (
                <p className="scroll-done">✓ All {total} items loaded</p>
              )}
            </div>
          )}

        </main>
      </div>

      {selectedProduct && <AddOnModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
    </div>
  );
}
