import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./styles.css";

// Pages
import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import AddRepositoryPage from "./pages/AddRepositoryPage.jsx";
import RepositoryOverviewPage from "./pages/RepositoryOverviewPage.jsx";
import ArchitecturePage from "./pages/ArchitecturePage.jsx";
import SetupGuidePage from "./pages/SetupGuidePage.jsx";
import StarterTasksPage from "./pages/StarterTasksPage.jsx";
import CodebaseQAPage from "./pages/CodebaseQAPage.jsx";
import OnboardingProgressPage from "./pages/OnboardingProgressPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import AnalysisProgressPage from "./pages/AnalysisProgressPage.jsx";

// Components
import { ToastProvider } from "./components/Layout.jsx";

// Auth context
export const AuthContext = React.createContext(null);
export const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export async function apiFetch(path, options = {}, token = "") {
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error("Network error — check your connection.");
  }

  const payload = await res.json().catch(() => ({}));

  if (res.status === 401) {
    // Only treat as an expired session for authenticated routes, not auth endpoints
    const isAuthEndpoint = path.startsWith("/auth/login") || path.startsWith("/auth/signup");
    if (!isAuthEndpoint) {
      window.dispatchEvent(new Event("auth:expired"));
    }
    throw new Error(payload.detail || (isAuthEndpoint ? "Invalid email or password." : "Session expired. Please sign in again."));
  }

  if (!res.ok) {
    // FastAPI detail can be a string or a list of validation errors
    let detail = payload.detail || payload.message;
    if (Array.isArray(detail)) {
      detail = detail.map((e) => e.msg || JSON.stringify(e)).join("; ");
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }

  return payload;
}

function AuthProvider({ children }) {
  const [token, setToken] = React.useState(
    () => localStorage.getItem("clocket_ai_token") || ""
  );
  const [user, setUser] = React.useState(null);
  const [authLoading, setAuthLoading] = React.useState(true);

  const login = (accessToken, userData = null) => {
    localStorage.setItem("clocket_ai_token", accessToken);
    setToken(accessToken);
    if (userData) setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("clocket_ai_token");
    setToken("");
    setUser(null);
  };

  React.useEffect(() => {
    function handleExpired() { logout(); }
    window.addEventListener("auth:expired", handleExpired);
    return () => window.removeEventListener("auth:expired", handleExpired);
  }, []);

  React.useEffect(() => {
    if (!token) {
      setAuthLoading(false);
      return;
    }
    apiFetch("/auth/me", {}, token)
      .then((u) => { setUser(u); setAuthLoading(false); })
      .catch(() => { logout(); setAuthLoading(false); });
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, authLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

function ProtectedRoute({ children }) {
  const { token, authLoading } = React.useContext(AuthContext);
  if (authLoading) return null;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { token, authLoading } = React.useContext(AuthContext);
  if (authLoading) return null;
  if (token) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public landing page */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            {/* Protected app */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/add-repository" element={<ProtectedRoute><AddRepositoryPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/repository/:repoId" element={<ProtectedRoute><RepositoryOverviewPage /></ProtectedRoute>} />
            <Route path="/repository/:repoId/analyzing" element={<ProtectedRoute><AnalysisProgressPage /></ProtectedRoute>} />
            <Route path="/repository/:repoId/architecture" element={<ProtectedRoute><ArchitecturePage /></ProtectedRoute>} />
            <Route path="/repository/:repoId/setup" element={<ProtectedRoute><SetupGuidePage /></ProtectedRoute>} />
            <Route path="/repository/:repoId/tasks" element={<ProtectedRoute><StarterTasksPage /></ProtectedRoute>} />
            <Route path="/repository/:repoId/qa" element={<ProtectedRoute><CodebaseQAPage /></ProtectedRoute>} />
            <Route path="/repository/:repoId/progress" element={<ProtectedRoute><OnboardingProgressPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
