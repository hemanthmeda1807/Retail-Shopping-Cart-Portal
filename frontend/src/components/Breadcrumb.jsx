import { Link } from 'react-router-dom';

export default function Breadcrumb({ crumbs }) {
  // crumbs: [{ label, to? }]
  return (
    <nav className="breadcrumb" aria-label="breadcrumb">
      {crumbs.map((c, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {i > 0 && <span className="sep">›</span>}
          {c.to ? <Link to={c.to}>{c.label}</Link> : <span>{c.label}</span>}
        </span>
      ))}
    </nav>
  );
}
