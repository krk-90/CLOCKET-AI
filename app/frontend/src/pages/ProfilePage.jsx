import React from "react";
import { AuthContext } from "../main.jsx";
import { Layout, useToast } from "../components/Layout.jsx";
import { User, Mail, Calendar, Shield, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ProfilePage() {
  const { user, logout } = React.useContext(AuthContext);
  const navigate = useNavigate();
  const { showToast } = useToast();

  function handleLogout() {
    logout();
    navigate("/login");
    showToast("Signed out successfully.", "info");
  }

  const userInitial = user?.email ? user.email[0].toUpperCase() : "U";
  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "Unknown";

  return (
    <Layout
      title="Profile"
      subtitle="Your account information"
      breadcrumb={[{ to: "/dashboard", label: "Dashboard" }, { label: "Profile" }]}
    >
      <div className="profile-grid">
        {/* Profile card */}
        <div>
          <div className="card">
            <div className="profile-card-body">
              <div className="profile-avatar">{userInitial}</div>
              <div className="profile-email">{user?.email || "—"}</div>
              <div className="profile-uid text-muted">
                {user?.id ? user.id.substring(0, 16) + "..." : ""}
              </div>
              <div className="badge badge-green">Active Account</div>
            </div>
          </div>

          <button
            className="btn btn-danger btn-full"
            onClick={handleLogout}
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>

        {/* Details */}
        <div>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <User size={15} className="card-title-icon" />
                Account Details
              </h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div className="text-muted text-xs" style={{ marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                  Email Address
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Mail size={14} style={{ color: "var(--muted)" }} />
                  <span style={{ fontSize: 14 }}>{user?.email || "—"}</span>
                </div>
              </div>

              <div>
                <div className="text-muted text-xs" style={{ marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                  Member Since
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Calendar size={14} style={{ color: "var(--muted)" }} />
                  <span style={{ fontSize: 14 }}>{createdAt}</span>
                </div>
              </div>

              <div>
                <div className="text-muted text-xs" style={{ marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                  Authentication
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Shield size={14} style={{ color: "var(--muted)" }} />
                  <span style={{ fontSize: 14 }}>Supabase email/password</span>
                  <span className="badge badge-green">Verified</span>
                </div>
              </div>

              <div>
                <div className="text-muted text-xs" style={{ marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                  User ID
                </div>
                <div style={{ fontFamily: "monospace", fontSize: 12, color: "var(--muted)", wordBreak: "break-all" }}>
                  {user?.id || "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="card card-accent">
            <div className="card-header">
              <h2 className="card-title">About CLOCKET AI</h2>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
              CLOCKET AI is an AI-powered developer onboarding assistant. It analyzes public GitHub
              repositories and generates complete onboarding experiences — including architecture
              insights, step-by-step setup guides, beginner-friendly starter tasks, and RAG-grounded
              codebase Q&A — so new contributors can get productive faster.
            </p>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="badge badge-blue">LangGraph</span>
              <span className="badge badge-green">FastAPI</span>
              <span className="badge badge-gray">Supabase</span>
              <span className="badge badge-purple">RAG</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
