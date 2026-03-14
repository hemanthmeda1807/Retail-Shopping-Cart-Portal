import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import Breadcrumb from '../components/Breadcrumb';
import './AdminDashboard.css';

const BLANK_PRODUCT = {
  title: '', description: '', cost: '', tax_percent: '5',
  category_id: '', stock_qty: '50', image_url: '', addons: [],
};
const BLANK_CATEGORY = { name: '', description: '', logo_url: '' };
const BLANK_STOCK = { product_id: '', change_qty: '', reason: '' };

export default function AdminDashboard() {
  const [tab, setTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stockHistory, setStockHistory] = useState([]);
  const [historyProductId, setHistoryProductId] = useState('');

  // ── Ledger state ────────────────────────────────────────────────
  const [ledger, setLedger]               = useState([]);
  const [ledgerSummary, setLedgerSummary] = useState({ totalAdded: 0, totalDeducted: 0, totalEntries: 0 });
  const [ledgerPage, setLedgerPage]       = useState(1);
  const [ledgerPages, setLedgerPages]     = useState(1);
  const [ledgerTotal, setLedgerTotal]     = useState(0);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerFilters, setLedgerFilters] = useState({ product: '', direction: '', source: '' });

  const [newProduct, setNewProduct] = useState(BLANK_PRODUCT);
  const [newCategory, setNewCategory] = useState(BLANK_CATEGORY);
  const [stockUpdate, setStockUpdate] = useState(BLANK_STOCK);
  const [editProduct, setEditProduct] = useState(null);

  const fileRef = useRef(null);
  const editFileRef = useRef(null);
  const [imagePreview, setImagePreview] = useState('');
  const [editImagePreview, setEditImagePreview] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/products?limit=100'),
      api.get('/categories'),
    ]).then(([p, c]) => {
      setProducts(p.data.data || []);
      setCategories(c.data.data || []);
      setLoading(false);
    });
    api.get('/auth/admin/users').then(({ data }) => setUsers(data.data || [])).catch(() => {});
  }, []);

  // --- Product CRUD ---
  const createProduct = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(newProduct).forEach(([k, v]) => {
        if (k === 'addons') fd.append(k, JSON.stringify(v));
        else fd.append(k, v);
      });
      if (fileRef.current?.files[0]) fd.append('image', fileRef.current.files[0]);
      const { data } = await api.post('/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProducts((p) => [data.data, ...p]);
      setNewProduct(BLANK_PRODUCT);
      setImagePreview('');
      if (fileRef.current) fileRef.current.value = '';
      toast.success('Product created!');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create product');
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      setProducts((p) => p.filter((x) => x._id !== id));
      toast.success('Product deleted');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Delete failed');
    }
  };

  const openEdit = (product) => {
    setEditProduct({ ...product, addons: product.addons || [], category_id: product.category_id?._id || product.category_id });
    setEditImagePreview(product.image_url || '');
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      ['title', 'description', 'cost', 'tax_percent', 'category_id', 'stock_qty', 'image_url'].forEach((k) => {
        if (editProduct[k] !== undefined) fd.append(k, editProduct[k]);
      });
      fd.append('addons', JSON.stringify(editProduct.addons || []));
      if (editFileRef.current?.files[0]) fd.append('image', editFileRef.current.files[0]);
      const { data } = await api.put(`/products/${editProduct._id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProducts((prev) => prev.map((p) => p._id === editProduct._id ? data.data : p));
      setEditProduct(null);
      toast.success('Product updated!');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Update failed');
    }
  };

  // --- Category CRUD ---
  const createCategory = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/categories', newCategory);
      setCategories((c) => [...c, data.data]);
      setNewCategory(BLANK_CATEGORY);
      toast.success('Category created!');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed');
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await api.delete(`/categories/${id}`);
      setCategories((c) => c.filter((x) => x._id !== id));
      toast.success('Category deleted');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Delete failed');
    }
  };

  // --- Stock Update ---
  const updateStock = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put(`/products/${stockUpdate.product_id}/stock`, {
        change_qty: parseInt(stockUpdate.change_qty),
        reason: stockUpdate.reason,
      });
      setProducts((prev) => prev.map((p) =>
        p._id === stockUpdate.product_id ? { ...p, stock_qty: data.data.new_stock } : p
      ));
      setStockUpdate(BLANK_STOCK);
      toast.success(`Stock updated! New qty: ${data.data.new_stock}`);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed');
    }
  };

  // Load stock history (per-product)
  const loadHistory = async (productId) => {
    if (!productId) return;
    setHistoryProductId(productId);
    try {
      const { data } = await api.get(`/products/${productId}/stock-history`);
      setStockHistory(data.data || []);
    } catch {
      setStockHistory([]);
    }
  };

  // ── Ledger helpers ───────────────────────────────────────────────
  const loadLedger = async (page = 1, filters = ledgerFilters) => {
    setLedgerLoading(true);
    try {
      const params = { page, limit: 25 };
      if (filters.product)   params.product   = filters.product;
      if (filters.direction) params.direction  = filters.direction;
      if (filters.source)    params.source     = filters.source;
      const { data } = await api.get('/stock/ledger', { params });
      setLedger(data.data || []);
      setLedgerSummary(data.summary || { totalAdded: 0, totalDeducted: 0, totalEntries: 0 });
      setLedgerPage(data.pagination.page);
      setLedgerPages(data.pagination.pages || 1);
      setLedgerTotal(data.pagination.total);
    } catch {
      setLedger([]);
    } finally {
      setLedgerLoading(false);
    }
  };

  // Addon helpers
  const addAddon = (formKey, setter) => setter((prev) => ({ ...prev, addons: [...(prev.addons || []), { name: '', price: 0 }] }));
  const removeAddon = (idx, setter) => setter((prev) => ({ ...prev, addons: prev.addons.filter((_, i) => i !== idx) }));
  const updateAddon = (idx, field, value, setter) => setter((prev) => ({
    ...prev,
    addons: prev.addons.map((a, i) => i === idx ? { ...a, [field]: field === 'price' ? parseFloat(value) || 0 : value } : a),
  }));

  const lowStockCount = products.filter((p) => p.stock_qty > 0 && p.stock_qty <= 5).length;
  const outStockCount = products.filter((p) => p.stock_qty === 0).length;

  if (loading) return <div className="page-loader"><div className="spinner" /><span>Loading admin...</span></div>;

  const TABS = [
    { id: 'products',   label: '🍔 Products' },
    { id: 'categories', label: '📂 Categories' },
    { id: 'stock',      label: '📦 Stock' },
    { id: 'ledger',     label: '📒 Ledger', onActivate: () => loadLedger(1) },
    { id: 'users',      label: '👥 Users' },
  ];

  const SOURCE_LABELS = {
    initial: { label: 'Initial',  cls: 'chip-blue'   },
    manual:  { label: 'Manual',   cls: 'chip-yellow'  },
    edit:    { label: 'Edit',     cls: 'chip-blue'    },
    order:   { label: 'Order',    cls: 'chip-red'     },
    reorder: { label: 'Reorder',  cls: 'chip-red'     },
  };

  return (
    <div className="admin-page container">
      <Breadcrumb crumbs={[{ label: 'Home', to: '/' }, { label: 'Admin' }]} />
      <h1 className="section-title" style={{ marginBottom: 20 }}>⚙️ Admin Dashboard</h1>

      {/* Stats */}
      <div className="admin-stats-row">
        <div className="stat-card stat-primary"><span>{products.length}</span><label>Products</label></div>
        <div className="stat-card stat-accent"><span>{categories.length}</span><label>Categories</label></div>
        <div className="stat-card stat-warn"><span>{lowStockCount}</span><label>Low Stock</label></div>
        <div className="stat-card"><span style={{ color: 'var(--primary)' }}>{outStockCount}</span><label>Out of Stock</label></div>
        <div className="stat-card stat-success"><span>{users.length}</span><label>Users</label></div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`admin-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => { setTab(t.id); t.onActivate?.(); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Products Tab ─────────────────────────────── */}
      {tab === 'products' && (
        <div className="admin-section">
          <div className="admin-panel card">
            <h2>Add New Product</h2>
            <form onSubmit={createProduct} className="admin-form">
              <div className="form-row">
                <div className="input-group">
                  <label>Title *</label>
                  <input className="input" value={newProduct.title} onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })} required id="product-title" />
                </div>
                <div className="input-group">
                  <label>Cost (₹) *</label>
                  <input className="input" type="number" min="0" step="0.01" value={newProduct.cost} onChange={(e) => setNewProduct({ ...newProduct, cost: e.target.value })} required id="product-cost" />
                </div>
              </div>
              <div className="form-row">
                <div className="input-group">
                  <label>Category *</label>
                  <select className="input" value={newProduct.category_id} onChange={(e) => setNewProduct({ ...newProduct, category_id: e.target.value })} required id="product-category">
                    <option value="">Select category</option>
                    {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Tax %</label>
                  <input className="input" type="number" min="0" max="100" value={newProduct.tax_percent} onChange={(e) => setNewProduct({ ...newProduct, tax_percent: e.target.value })} id="product-tax" />
                </div>
              </div>
              <div className="input-group">
                <label>Description</label>
                <input className="input" value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} id="product-desc" />
              </div>
              <div className="form-row">
                <div className="input-group">
                  <label>Stock Qty</label>
                  <input className="input" type="number" min="0" value={newProduct.stock_qty} onChange={(e) => setNewProduct({ ...newProduct, stock_qty: e.target.value })} id="product-stock" />
                </div>
              </div>

              {/* Image Upload */}
              <div className="input-group img-upload-wrap">
                <label>Product Image</label>
                {imagePreview ? (
                  <img className="img-preview" src={imagePreview} alt="Preview" />
                ) : (
                  <div className="img-preview-placeholder">
                    <span>🖼️</span>
                    <p>Upload an image or enter URL</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  ref={fileRef}
                  className="input"
                  style={{ padding: '8px' }}
                  onChange={(e) => {
                    const f = e.target.files[0];
                    if (f) setImagePreview(URL.createObjectURL(f));
                  }}
                  id="product-image-file"
                />
                <input
                  className="input"
                  placeholder="Or paste image URL..."
                  value={newProduct.image_url}
                  onChange={(e) => { setNewProduct({ ...newProduct, image_url: e.target.value }); setImagePreview(e.target.value); }}
                  id="product-image-url"
                />
              </div>

              {/* Add-ons Builder */}
              <div className="input-group">
                <label>Add-ons</label>
                <div className="addons-list">
                  {(newProduct.addons || []).map((addon, idx) => (
                    <div key={idx} className="addon-row">
                      <input className="input" placeholder="Name (e.g. Extra Cheese)" value={addon.name} onChange={(e) => updateAddon(idx, 'name', e.target.value, setNewProduct)} />
                      <input className="input" type="number" min="0" placeholder="Price" style={{ maxWidth: 90 }} value={addon.price} onChange={(e) => updateAddon(idx, 'price', e.target.value, setNewProduct)} />
                      <button type="button" className="addon-remove" onClick={() => removeAddon(idx, setNewProduct)}>✕</button>
                    </div>
                  ))}
                </div>
                <button type="button" className="add-addon-btn" onClick={() => addAddon('newProduct', setNewProduct)}>+ Add an Add-on</button>
              </div>

              <button type="submit" className="btn btn-primary" id="create-product-btn">Create Product</button>
            </form>
          </div>

          {/* Products Table */}
          <div className="product-table-section">
            <div className="section-header">
              <h2 className="section-title" style={{ marginBottom: 0 }}>All Products ({products.length})</h2>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {p.image_url && <img src={p.image_url} alt={p.title} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />}
                          <strong>{p.title}</strong>
                        </div>
                      </td>
                      <td>{p.category_id?.name || '—'}</td>
                      <td>₹{p.cost}</td>
                      <td>
                        <span className={`chip ${p.stock_qty > 10 ? 'chip-green' : p.stock_qty > 0 ? 'chip-yellow' : 'chip-red'}`}>
                          {p.stock_qty}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>✏️ Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteProduct(p._id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Categories Tab ────────────────────────────── */}
      {tab === 'categories' && (
        <div className="admin-section">
          <div className="admin-panel card">
            <h2>Add New Category</h2>
            <form onSubmit={createCategory} className="admin-form">
              <div className="input-group">
                <label>Name *</label>
                <input className="input" value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} required id="cat-name" />
              </div>
              <div className="input-group">
                <label>Description</label>
                <input className="input" value={newCategory.description} onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Logo URL</label>
                <input className="input" placeholder="https://..." value={newCategory.logo_url} onChange={(e) => setNewCategory({ ...newCategory, logo_url: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary" id="create-cat-btn">Create Category</button>
            </form>
          </div>

          <div>
            <h2 className="section-title" style={{ marginBottom: 16 }}>All Categories ({categories.length})</h2>
            <div className="cat-grid">
              {categories.map((c) => (
                <div key={c._id} className="cat-admin-card card">
                  <button className="cat-delete-btn" onClick={() => deleteCategory(c._id)} title="Delete">✕</button>
                  <div className="cat-emoji">
                    {c.logo_url ? <img src={c.logo_url} alt={c.name} /> : '📂'}
                  </div>
                  <strong>{c.name}</strong>
                  <p>{c.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Stock Tab ─────────────────────────────────── */}
      {tab === 'stock' && (
        <div className="admin-section">
          <div className="admin-panel card">
            <h2>Update Stock</h2>
            <form onSubmit={updateStock} className="admin-form">
              <div className="input-group">
                <label>Select Product *</label>
                <select
                  className="input"
                  value={stockUpdate.product_id}
                  onChange={(e) => {
                    setStockUpdate({ ...stockUpdate, product_id: e.target.value });
                    loadHistory(e.target.value);
                  }}
                  required
                  id="stock-product"
                >
                  <option value="">Select product</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>{p.title} (Stock: {p.stock_qty})</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>Change Qty (+ add, − deduct)</label>
                <input className="input" type="number" placeholder="e.g. 50 or -10" value={stockUpdate.change_qty} onChange={(e) => setStockUpdate({ ...stockUpdate, change_qty: e.target.value })} required id="stock-change" />
              </div>
              <div className="input-group">
                <label>Reason</label>
                <input className="input" placeholder="e.g. Restock, Damaged goods" value={stockUpdate.reason} onChange={(e) => setStockUpdate({ ...stockUpdate, reason: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary" id="update-stock-btn">Update Stock</button>
            </form>
          </div>

          {/* Stock History */}
          {historyProductId && (
            <div className="stock-history-wrap">
              <h2 className="section-title" style={{ marginBottom: 14 }}>📋 Stock History</h2>
              {stockHistory.length === 0 ? (
                <div className="empty-state" style={{ padding: '30px 20px' }}>
                  <div className="icon" style={{ fontSize: 32 }}>📭</div>
                  <p>No history yet for this product.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Change</th><th>Reason</th><th>By</th><th>Date</th></tr>
                    </thead>
                    <tbody>
                      {stockHistory.map((h) => (
                        <tr key={h._id}>
                          <td>
                            <span className={`chip ${h.change_qty > 0 ? 'chip-green' : 'chip-red'}`}>
                              {h.change_qty > 0 ? '+' : ''}{h.change_qty}
                            </span>
                          </td>
                          <td>{h.reason}</td>
                          <td>{h.updated_by?.name || '—'}</td>
                          <td>{new Date(h.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Ledger Tab ─────────────────────────────────── */}
      {tab === 'ledger' && (
        <div className="admin-section">

          {/* Summary cards */}
          <div className="ledger-summary-row">
            <div className="ledger-stat">
              <span className="ledger-stat-val" style={{ color: 'var(--success)' }}>+{ledgerSummary.totalAdded}</span>
              <label>Total Added</label>
            </div>
            <div className="ledger-stat">
              <span className="ledger-stat-val" style={{ color: 'var(--primary)' }}>{ledgerSummary.totalDeducted}</span>
              <label>Total Deducted</label>
            </div>
            <div className="ledger-stat">
              <span className="ledger-stat-val">{ledgerTotal}</span>
              <label>Total Entries</label>
            </div>
          </div>

          {/* Filters */}
          <div className="ledger-filters">
            <select
              className="input"
              value={ledgerFilters.product}
              onChange={(e) => { const f = { ...ledgerFilters, product: e.target.value }; setLedgerFilters(f); loadLedger(1, f); }}
            >
              <option value="">All Products</option>
              {products.map((p) => <option key={p._id} value={p._id}>{p.title}</option>)}
            </select>

            <select
              className="input"
              value={ledgerFilters.direction}
              onChange={(e) => { const f = { ...ledgerFilters, direction: e.target.value }; setLedgerFilters(f); loadLedger(1, f); }}
            >
              <option value="">All Directions</option>
              <option value="in">Stock In (+)</option>
              <option value="out">Stock Out (−)</option>
            </select>

            <select
              className="input"
              value={ledgerFilters.source}
              onChange={(e) => { const f = { ...ledgerFilters, source: e.target.value }; setLedgerFilters(f); loadLedger(1, f); }}
            >
              <option value="">All Sources</option>
              <option value="initial">Initial</option>
              <option value="manual">Manual</option>
              <option value="edit">Edit</option>
              <option value="order">Order</option>
              <option value="reorder">Reorder</option>
            </select>

            <button className="btn btn-ghost btn-sm" onClick={() => { const f = { product: '', direction: '', source: '' }; setLedgerFilters(f); loadLedger(1, f); }}>Clear</button>
          </div>

          {/* Table */}
          {ledgerLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
          ) : ledger.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📭</div>
              <h3>No ledger entries yet</h3>
              <p>Stock changes will appear here automatically.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Change</th>
                    <th>Balance After</th>
                    <th>Source</th>
                    <th>Reason</th>
                    <th>By</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((h) => {
                    const src = SOURCE_LABELS[h.source] || { label: h.source, cls: 'chip-blue' };
                    return (
                      <tr key={h._id}>
                        <td><strong>{h.product_id?.title || '—'}</strong></td>
                        <td>
                          <span className={`chip ${h.change_qty > 0 ? 'chip-green' : 'chip-red'}`}>
                            {h.change_qty > 0 ? '+' : ''}{h.change_qty}
                          </span>
                        </td>
                        <td><span className="chip chip-blue">{h.snapshot_qty ?? '—'}</span></td>
                        <td><span className={`chip ${src.cls}`}>{src.label}</span></td>
                        <td className="ledger-reason-cell">{h.reason || '—'}</td>
                        <td>{h.updated_by?.name || (h.source === 'order' || h.source === 'reorder' ? 'System' : '—')}</td>
                        <td>{new Date(h.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {ledgerPages > 1 && (
            <div className="pagination">
              <button className="page-btn" onClick={() => loadLedger(ledgerPage - 1)} disabled={ledgerPage === 1}>‹ Prev</button>
              <span style={{ padding: '0 12px', fontSize: 13, color: 'var(--text-muted)' }}>
                Page {ledgerPage} of {ledgerPages}
              </span>
              <button className="page-btn" onClick={() => loadLedger(ledgerPage + 1)} disabled={ledgerPage === ledgerPages}>Next ›</button>
            </div>
          )}
        </div>
      )}

      {/* ── Users Tab ─────────────────────────────────── */}
      {tab === 'users' && (
        <div>
          <div className="section-header">
            <h2 className="section-title" style={{ marginBottom: 0 }}>👥 Users ({users.length})</h2>
          </div>
          {users.length === 0 ? (
            <div className="empty-state"><div className="icon">👥</div><h3>No users yet</h3></div>
          ) : (
            <div className="users-list">
              {users.map((u) => (
                <div key={u._id} className="user-row">
                  <div className="user-avatar-sm">
                    {u.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="user-info">
                    <strong>{u.name}</strong>
                    <p>{u.email}</p>
                  </div>
                  <span className={`chip ${u.role === 'admin' ? 'chip-red' : 'chip-blue'}`}>
                    {u.role}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {new Date(u.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Product Modal */}
      {editProduct && (
        <div className="edit-overlay" onClick={() => setEditProduct(null)}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ marginBottom: 0 }}>✏️ Edit Product</h2>
              <button className="modal-close" onClick={() => setEditProduct(null)}>✕</button>
            </div>
            <form onSubmit={saveEdit} className="admin-form">
              <div className="form-row">
                <div className="input-group">
                  <label>Title *</label>
                  <input className="input" value={editProduct.title} onChange={(e) => setEditProduct({ ...editProduct, title: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label>Cost (₹)</label>
                  <input className="input" type="number" min="0" value={editProduct.cost} onChange={(e) => setEditProduct({ ...editProduct, cost: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="input-group">
                  <label>Category</label>
                  <select className="input" value={editProduct.category_id} onChange={(e) => setEditProduct({ ...editProduct, category_id: e.target.value })}>
                    {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Tax %</label>
                  <input className="input" type="number" min="0" max="100" value={editProduct.tax_percent} onChange={(e) => setEditProduct({ ...editProduct, tax_percent: e.target.value })} />
                </div>
              </div>
              <div className="input-group">
                <label>Description</label>
                <input className="input" value={editProduct.description} onChange={(e) => setEditProduct({ ...editProduct, description: e.target.value })} />
              </div>
              <div className="input-group img-upload-wrap">
                <label>Image</label>
                {editImagePreview && <img className="img-preview" src={editImagePreview} alt="Preview" />}
                <input type="file" accept="image/*" ref={editFileRef} className="input" style={{ padding: 8 }} onChange={(e) => { const f = e.target.files[0]; if (f) setEditImagePreview(URL.createObjectURL(f)); }} />
                <input className="input" placeholder="Or paste image URL..." value={editProduct.image_url} onChange={(e) => { setEditProduct({ ...editProduct, image_url: e.target.value }); setEditImagePreview(e.target.value); }} />
              </div>
              <div className="input-group">
                <label>Add-ons</label>
                <div className="addons-list">
                  {(editProduct.addons || []).map((addon, idx) => (
                    <div key={idx} className="addon-row">
                      <input className="input" placeholder="Name" value={addon.name} onChange={(e) => updateAddon(idx, 'name', e.target.value, setEditProduct)} />
                      <input className="input" type="number" min="0" placeholder="Price" style={{ maxWidth: 90 }} value={addon.price} onChange={(e) => updateAddon(idx, 'price', e.target.value, setEditProduct)} />
                      <button type="button" className="addon-remove" onClick={() => removeAddon(idx, setEditProduct)}>✕</button>
                    </div>
                  ))}
                </div>
                <button type="button" className="add-addon-btn" onClick={() => setEditProduct((prev) => ({ ...prev, addons: [...(prev.addons || []), { name: '', price: 0 }] }))}>+ Add an Add-on</button>
              </div>
              <div className="edit-modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setEditProduct(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
