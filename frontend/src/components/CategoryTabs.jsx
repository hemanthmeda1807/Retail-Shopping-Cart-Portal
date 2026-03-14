import './CategoryTabs.css';

export default function CategoryTabs({ categories, activeId, onSelect }) {
  return (
    <div className="category-tabs-wrap">
      <div className="category-tabs">
        <button
          className={`cat-tab ${!activeId ? 'active' : ''}`}
          onClick={() => onSelect(null)}
        >
          <span className="cat-icon">🍽️</span>
          <span>All</span>
        </button>
        {categories.map((cat) => (
          <button
            key={cat._id}
            className={`cat-tab ${activeId === cat._id ? 'active' : ''}`}
            onClick={() => onSelect(cat._id)}
          >
            <span className="cat-icon">
              {cat.logo_url
                ? <img src={cat.logo_url} alt={cat.name} />
                : getCatEmoji(cat.name)}
            </span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function getCatEmoji(name) {
  const map = {
    burgers: '🍔', pizza: '🍕', drinks: '🥤', sides: '🍟',
    breads: '🥖', desserts: '🍰', chicken: '🍗', salads: '🥗',
  };
  const key = name.toLowerCase().split(' ')[0];
  return map[key] || '🍽️';
}
