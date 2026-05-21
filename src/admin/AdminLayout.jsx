import { Outlet, Link, useLocation } from 'react-router-dom';
import AuthGate from './AuthGate';
import './editor.css';

const NAV_ITEMS = [
  { path: '/admin', label: 'Dashboard' },
  { path: '/admin/compose', label: 'Compose' },
  { path: '/admin/posts', label: 'Posts' },
  { path: '/admin/contacts', label: 'Contacts' },
  { path: '/admin/images', label: 'Images' },
];

export default function AdminLayout() {
  const location = useLocation();

  return (
    <AuthGate>
      <div style={styles.layout}>
        <nav style={styles.nav}>
          <div style={styles.logo}><span style={styles.logoMark}>&#9673;</span> PAUSE</div>
          <div style={styles.links}>
            {NAV_ITEMS.map(item => {
              const isActive = location.pathname === item.path ||
                (item.path !== '/admin' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    ...styles.link,
                    ...(isActive ? styles.activeLink : {}),
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
          <a href="/" style={styles.backLink}>← Site</a>
        </nav>
        <main style={styles.main}>
          <Outlet />
        </main>
      </div>
    </AuthGate>
  );
}

const styles = {
  layout: {
    display: 'flex', minHeight: '100vh', background: '#141210', color: '#e8e3dc',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  nav: {
    width: 200, padding: '32px 16px', borderRight: '1px solid #2a2520',
    display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0,
  },
  logo: {
    fontWeight: 600, fontSize: 15, letterSpacing: '0.14em', color: '#fff',
    marginBottom: 24, paddingLeft: 8,
  },
  logoMark: { color: '#b85c38' },
  links: { display: 'flex', flexDirection: 'column', gap: 4 },
  link: {
    color: '#a89d91', textDecoration: 'none', fontSize: 14, padding: '8px 12px',
    borderRadius: 6, transition: 'background 0.15s',
  },
  activeLink: { color: '#fff', background: '#2a2520' },
  backLink: {
    color: '#6d6259', textDecoration: 'none', fontSize: 12,
    marginTop: 'auto', paddingLeft: 8,
  },
  main: { flex: 1, padding: '32px 40px', overflowY: 'auto', maxWidth: '100%' },
};
