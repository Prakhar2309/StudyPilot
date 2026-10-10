import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Bot, BookOpen, CheckSquare,
  Calendar, TrendingUp, Activity, GraduationCap,
  Menu, X, Zap
} from 'lucide-react';
import { healthApi } from '../api/client';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/agent', icon: Bot, label: 'AI Agent' },
  { to: '/subjects', icon: BookOpen, label: 'Subjects & Topics' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/planner', icon: Calendar, label: 'Study Planner' },
  { to: '/progress', icon: TrendingUp, label: 'Progress' },
  { to: '/activity', icon: Activity, label: 'Agent Activity' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDemo, setIsDemo] = useState(true);
  const location = useLocation();

  useEffect(() => {
    healthApi.check().then(r => setIsDemo(r?.data?.demoMode ?? true)).catch(() => {});
  }, []);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '10px',
              background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <GraduationCap size={20} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.02em' }}>StudyPilot</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>AI Study Agent</div>
            </div>
          </div>
        </div>

        {/* Demo mode indicator */}
        {isDemo && (
          <div style={{ padding: '0.5rem 1rem' }}>
            <div className="demo-banner">
              <Zap size={12} /> Demo Mode
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0.75rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          <div>StudyPilot AI v1.0</div>
          <div>Autonomous Study Planning</div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 30 }}
        />
      )}

      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="btn btn-ghost btn-sm"
        style={{
          position: 'fixed', top: '1rem', left: '1rem', zIndex: 50,
          display: 'none', // Hidden on desktop, shown on mobile via media query
          padding: '0.5rem',
        }}
        aria-label="Toggle sidebar"
        id="mobile-menu-btn"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Main content */}
      <main className="main-layout" style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}
