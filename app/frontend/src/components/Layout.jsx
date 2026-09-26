import React from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../main.jsx";
import {
  Home, Plus, GitBranch, Layers, Terminal, ListTodo,
  MessageSquare, TrendingUp, LogOut, Code2, Menu, X,
  ChevronRight, User
} from "lucide-react";

export function Layout({ children, title, subtitle, breadcrumb, actions }) {
  const { user, logout } = React.useContext(AuthContext);
  const location = useLocation();
  const { repoId } = useParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const isActive = (to) => location.pathname === to || (
    to !== "/dashboard" &&
    to !== `/repository/${repoId}` &&
    location.pathname.startsWith(`${to}/`)
  );

  React.useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  React.useEffect(() => {
    if (!sidebarOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [sidebarOpen]);

  const navItems = [
    { to: "/dashboard", icon: <Home size={15} />, label: "Dashboard" },
    { to: "/add-repository", icon: <Plus size={15} />, label: "Add Repository" },
    { to: "/profile", icon: <User size={15} />, label: "Profile" },
  ];

  const repoItems = repoId ? [
    { to: `/repository/${repoId}`, icon: <GitBranch size={15} />, label: "Overview" },
    { to: `/repository/${repoId}/architecture`, icon: <Layers size={15} />, label: "Architecture" },
    { to: `/repository/${repoId}/setup`, icon: <Terminal size={15} />, label: "Setup Guide" },
    { to: `/repository/${repoId}/tasks`, icon: <ListTodo size={15} />, label: "Starter Tasks" },
    { to: `/repository/${repoId}/qa`, icon: <MessageSquare size={15} />, label: "Codebase Q&A" },
    { to: `/repository/${repoId}/progress`, icon: <TrendingUp size={15} />, label: "My Progress" },
  ] : [];

  const userInitial = user?.email ? user.email[0].toUpperCase() : "U";

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const SidebarContent = () => (
    <>
      <div className="sidebar-brand">
        <Code2 size={20} className="brand-icon" />
        <div>
          <span className="brand-name">CLOCKET AI</span>
          <span className="brand-sub">Developer Onboarding</span>
        </div>
      </div>

      <div className="nav-section">
        <span className="nav-section-label">General</span>
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`nav-item ${isActive(item.to) ? "active" : ""}`}
            aria-current={isActive(item.to) ? "page" : undefined}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="nav-item-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>

      {repoItems.length > 0 && (
        <div className="nav-section">
          <span className="nav-section-label">Repository</span>
          {repoItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-item ${isActive(item.to) ? "active" : ""}`}
              aria-current={isActive(item.to) ? "page" : undefined}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-item-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      )}

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">{userInitial}</div>
          <div className="user-info-text">
            <span className="user-email">{user?.email || "User"}</span>
            <span className="user-role">Developer</span>
          </div>
        </div>
        <button className="nav-item btn" style={{ color: "#8b949e" }} onClick={handleLogout}>
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="layout">
      {/* Mobile overlay */}
      <button
        type="button"
        className={`sidebar-overlay ${sidebarOpen ? "visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
        aria-label="Close navigation menu"
        tabIndex={sidebarOpen ? 0 : -1}
      />

      {/* Sidebar */}
      <nav id="app-sidebar" className={`sidebar ${sidebarOpen ? "open" : ""}`} aria-label="Main navigation">
        {SidebarContent()}
      </nav>

      {/* Main content */}
      <main className="main-content">
        {/* Mobile header */}
        <div className="mobile-header">
          <div className="mobile-brand">
            <Code2 size={18} style={{ color: "var(--accent)" }} />
            CLOCKET AI
          </div>
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label={sidebarOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={sidebarOpen}
            aria-controls="app-sidebar"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Page header */}
        <div className="page-header">
          <div className="page-header-inner">
            <div className="page-title-group">
              {breadcrumb && (
                <div className="page-breadcrumb">
                  {breadcrumb.map((item, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <ChevronRight size={12} />}
                      {item.to ? <Link to={item.to}>{item.label}</Link> : <span>{item.label}</span>}
                    </React.Fragment>
                  ))}
                </div>
              )}
              <h1 className="page-title">{title}</h1>
              {subtitle && <p className="page-subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="page-actions">{actions}</div>}
          </div>
        </div>

        <div className="page-body">{children}</div>
      </main>
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    pending: "badge-gray",
    analyzing: "badge-blue",
    ready: "badge-green",
    failed: "badge-red",
    beginner: "badge-green",
    intermediate: "badge-amber",
    advanced: "badge-red",
    todo: "badge-gray",
    in_progress: "badge-blue",
    done: "badge-green",
    skipped: "badge-gray",
  };
  return (
    <span className={`badge ${map[status] || "badge-gray"}`}>
      {status?.replace(/_/g, " ")}
    </span>
  );
}

export function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="error-banner" role="alert">
      <span>{message}</span>
      {onDismiss && <button type="button" onClick={onDismiss} aria-label="Dismiss error">✕</button>}
    </div>
  );
}

export function LoadingSpinner({ text = "Loading..." }) {
  return (
    <div className="loading-wrap">
      <div className="spinner" />
      <span className="loading-text">{text}</span>
    </div>
  );
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-icon">{icon}</div>}
      <div className="empty-title">{title}</div>
      {description && <p className="empty-desc">{description}</p>}
      {action}
    </div>
  );
}

// Toast context
export const ToastContext = React.createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([]);
  const nextId = React.useRef(0);
  const timers = React.useRef(new Map());

  const showToast = React.useCallback((message, type = "info", duration = 4000) => {
    const id = ++nextId.current;
    setToasts((t) => [...t, { id, message, type }]);
    const timer = setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
      timers.current.delete(id);
    }, duration);
    timers.current.set(id, timer);
  }, []);

  React.useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
  }, []);

  const removeToast = (id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((t) => t.filter((x) => x.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span className="toast-message">{toast.message}</span>
            <button type="button" className="toast-close" onClick={() => removeToast(toast.id)} aria-label="Dismiss notification">✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return React.useContext(ToastContext);
}

export function CopyButton({ text, className = "" }) {
  const [copied, setCopied] = React.useState(false);
  async function copy(e) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }
  return (
    <button type="button" className={`copy-btn ${className}`} onClick={copy} title={copied ? "Copied" : "Copy"} aria-label={copied ? "Copied to clipboard" : "Copy to clipboard"}>
      {copied ? "✓" : "⎘"}
    </button>
  );
}
