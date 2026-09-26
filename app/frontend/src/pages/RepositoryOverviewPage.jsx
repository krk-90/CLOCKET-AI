import React from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { AuthContext, apiFetch } from "../main.jsx";
import { Layout, StatusBadge, LoadingSpinner, ErrorBanner, useToast } from "../components/Layout.jsx";
import {
  GitBranch, Layers, Terminal, ListTodo, MessageSquare, TrendingUp,
  ExternalLink, RefreshCw, Code, Database, Box, AlertTriangle, Star
} from "lucide-react";

export default function RepositoryOverviewPage() {
  const { token } = React.useContext(AuthContext);
  const { repoId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const fetchData = React.useCallback(async () => {
    try {
      const result = await apiFetch(`/analysis/${repoId}/results`, {}, token);
      setData(result);
      // If still analyzing, redirect to progress page
      if (result.repository?.status === "analyzing") {
        navigate(`/repository/${repoId}/analyzing`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [repoId, token, navigate]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function triggerAnalysis() {
    try {
      await apiFetch(`/analysis/${repoId}/trigger`, { method: "POST" }, token);
      showToast("Analysis started!", "success");
      navigate(`/repository/${repoId}/analyzing`);
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  if (loading) return <Layout title="Repository Overview"><LoadingSpinner text="Loading repository data..." /></Layout>;

  const repo = data?.repository;
  const analysis = data?.analysis;

  if (!repo) return (
    <Layout title="Repository Overview">
      <ErrorBanner message={error || "Repository not found."} />
    </Layout>
  );

  const stack = analysis?.technology_stack || {};
  const langs = Object.entries(stack.languages || {}).slice(0, 8);
  const frameworks = stack.frameworks || [];
  const infra = stack.infrastructure || [];
  const databases = analysis?.database_info?.databases || [];

  const navCards = [
    { to: `/repository/${repoId}/architecture`, icon: <Layers size={20} />, label: "Architecture", desc: "Visual component breakdown", available: !!analysis },
    { to: `/repository/${repoId}/setup`, icon: <Terminal size={20} />, label: "Setup Guide", desc: "Step-by-step instructions", available: !!analysis },
    { to: `/repository/${repoId}/tasks`, icon: <ListTodo size={20} />, label: "Starter Tasks", desc: "Beginner-friendly contributions", available: !!analysis },
    { to: `/repository/${repoId}/qa`, icon: <MessageSquare size={20} />, label: "Codebase Q&A", desc: "Ask questions about the code", available: !!analysis },
    { to: `/repository/${repoId}/progress`, icon: <TrendingUp size={20} />, label: "My Progress", desc: "Track your onboarding journey", available: true },
  ];

  return (
    <Layout
      title={`${repo.owner}/${repo.name}`}
      subtitle={repo.github_url}
      breadcrumb={[{ to: "/dashboard", label: "Dashboard" }, { label: `${repo.owner}/${repo.name}` }]}
      actions={
        <div style={{ display: "flex", gap: 8 }}>
          <a href={repo.github_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
            <ExternalLink size={13} /> GitHub
          </a>
          {repo.status === "failed" && (
            <button className="btn btn-primary btn-sm" onClick={triggerAnalysis}>
              <RefreshCw size={13} /> Retry
            </button>
          )}
        </div>
      }
    >
      <ErrorBanner message={error} onDismiss={() => setError("")} />

      {/* Status banners */}
      {repo.status === "pending" && (
        <div className="status-banner banner-amber">
          <AlertTriangle size={16} />
          Analysis not started.
          <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={triggerAnalysis}>
            Start Analysis
          </button>
        </div>
      )}
      {repo.status === "failed" && (
        <div className="status-banner banner-red">
          <AlertTriangle size={16} />
          Analysis failed: {repo.error_message}
        </div>
      )}

      {/* Repository header */}
      <div className="card">
        <div className="repo-overview-header">
          <div className="repo-overview-icon">
            <GitBranch size={24} />
          </div>
          <div className="repo-overview-info">
            <div className="d-flex align-center gap-8 mb-4">
              <div className="repo-overview-title">{repo.owner}/{repo.name}</div>
              <StatusBadge status={repo.status} />
            </div>
            <a href={repo.github_url} target="_blank" rel="noopener noreferrer" className="repo-overview-url">
              {repo.github_url} <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {analysis?.onboarding_plan && (
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7, marginTop: 4, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            {analysis.onboarding_plan.substring(0, 400)}
            {analysis.onboarding_plan.length > 400 && "..."}
          </p>
        )}
      </div>

      {/* Tech stack */}
      {analysis && (
        <>
          <h3 className="section-heading"><Code size={13} /> Technology Stack</h3>
          <div className="tech-grid">
            <div className="card mb-0">
              <div className="card-header">
                <h3 className="card-title"><Code size={14} className="card-title-icon" /> Languages</h3>
              </div>
              <div className="tag-list">
                {langs.map(([lang, count]) => (
                  <span key={lang} className="tag">{lang} <span className="tag-count">({count})</span></span>
                ))}
                {langs.length === 0 && <span className="text-muted text-sm">None detected</span>}
              </div>
            </div>
            <div className="card mb-0">
              <div className="card-header">
                <h3 className="card-title"><Box size={14} className="card-title-icon" /> Frameworks</h3>
              </div>
              <div className="tag-list">
                {frameworks.map((f) => <span key={f} className="tag tag-blue">{f}</span>)}
                {frameworks.length === 0 && <span className="text-muted text-sm">None detected</span>}
              </div>
            </div>
            <div className="card mb-0">
              <div className="card-header">
                <h3 className="card-title"><Database size={14} className="card-title-icon" /> Infrastructure</h3>
              </div>
              <div className="tag-list">
                {databases.map((d) => <span key={d} className="tag tag-purple">{d}</span>)}
                {infra.map((i) => <span key={i} className="tag tag-gray">{i}</span>)}
                {databases.length === 0 && infra.length === 0 && <span className="text-muted text-sm">None detected</span>}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Navigation cards */}
      <h3 className="section-heading"><Star size={13} /> Onboarding Sections</h3>
      <div className="nav-cards-grid">
        {navCards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="nav-card"
            aria-disabled={!card.available}
            tabIndex={card.available ? undefined : -1}
            onClick={(event) => { if (!card.available) event.preventDefault(); }}
            style={!card.available ? { opacity: 0.5, cursor: "not-allowed" } : {}}
          >
            <div className="nav-card-icon">{card.icon}</div>
            <div>
              <div className="nav-card-label">{card.label}</div>
              <div className="nav-card-desc">{card.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Configuration issues */}
      {analysis?.setup_issues?.length > 0 && (
        <div className="card card-amber">
          <div className="card-header">
            <h3 className="card-title"><AlertTriangle size={15} style={{ color: "var(--amber)" }} /> Configuration Findings</h3>
          </div>
          <div className="issues-list">
            {analysis.setup_issues.map((issue, i) => (
              <div key={i} className={`issue-item severity-${issue.severity || "low"}`}>
                <span className="issue-type">{(issue.type || "").replace(/_/g, " ")}</span>
                <span>{issue.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}
