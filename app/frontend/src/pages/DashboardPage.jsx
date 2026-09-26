import React from "react";
import { Link } from "react-router-dom";
import { AuthContext, apiFetch } from "../main.jsx";
import { Layout, StatusBadge, LoadingSpinner, EmptyState, ErrorBanner, useToast } from "../components/Layout.jsx";
import {
  Plus, GitBranch, ExternalLink, Trash2, Clock, CheckCircle,
  AlertCircle, Loader, RefreshCw, TrendingUp, Activity
} from "lucide-react";

function StatusIcon({ status }) {
  if (status === "analyzing") return <Loader size={14} className="spin" style={{ color: "var(--accent)" }} />;
  if (status === "ready") return <CheckCircle size={14} style={{ color: "var(--green)" }} />;
  if (status === "failed") return <AlertCircle size={14} style={{ color: "var(--red)" }} />;
  return <Clock size={14} style={{ color: "var(--muted)" }} />;
}

function RepoCard({ repo, onDelete, onTrigger }) {
  return (
    <div className="repo-card">
      <div className="repo-card-header">
        <div className="repo-card-icon">
          <GitBranch size={18} />
        </div>
        <div className="repo-card-meta">
          <span className="repo-name">{repo.owner}/{repo.name}</span>
          <span className="repo-url text-muted">{repo.github_url}</span>
        </div>
      </div>

      {repo.status === "analyzing" && (
        <div className="analyzing-bar">
          <div className="analyzing-fill" />
        </div>
      )}

      <div className="repo-status-row">
        <StatusIcon status={repo.status} />
        <StatusBadge status={repo.status} />
        <span className="text-muted text-xs" style={{ marginLeft: "auto" }}>
          {repo.created_at ? new Date(repo.created_at).toLocaleDateString() : ""}
        </span>
      </div>

      {repo.error_message && (
        <p style={{ fontSize: 11, color: "var(--red)" }}>{repo.error_message}</p>
      )}

      <div className="repo-card-footer">
        {repo.status === "ready" && (
          <Link to={`/repository/${repo.id}`} className="btn btn-primary btn-sm">
            Open Onboarding
          </Link>
        )}
        {repo.status === "analyzing" && (
          <Link to={`/repository/${repo.id}/analyzing`} className="btn btn-secondary btn-sm">
            <Activity size={13} /> View Progress
          </Link>
        )}
        {(repo.status === "failed" || repo.status === "pending") && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onTrigger(repo.id)}
          >
            <RefreshCw size={13} />
            {repo.status === "failed" ? "Retry Analysis" : "Start Analysis"}
          </button>
        )}
        <a
          href={repo.github_url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost btn-sm btn-icon"
          title="Open on GitHub"
        >
          <ExternalLink size={13} />
        </a>
        <button
          className="btn btn-ghost btn-sm btn-icon"
          style={{ color: "var(--red)" }}
          onClick={() => onDelete(repo.id)}
          title="Delete repository"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { token, user } = React.useContext(AuthContext);
  const { showToast } = useToast();
  const [repos, setRepos] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const fetchRepos = React.useCallback(async () => {
    try {
      const data = await apiFetch("/repositories/", {}, token);
      setRepos(data.repositories || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  // Poll when any repo is analyzing
  React.useEffect(() => {
    const hasAnalyzing = repos.some((r) => r.status === "analyzing");
    if (!hasAnalyzing) return;
    const interval = setInterval(fetchRepos, 5000);
    return () => clearInterval(interval);
  }, [repos, fetchRepos]);

  async function handleTrigger(repoId) {
    try {
      await apiFetch(`/analysis/${repoId}/trigger`, { method: "POST" }, token);
      showToast("Analysis started!", "success");
      fetchRepos();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function handleDelete(repoId) {
    if (!confirm("Delete this repository and all associated analysis data?")) return;
    try {
      await apiFetch(`/repositories/${repoId}`, { method: "DELETE" }, token);
      setRepos((r) => r.filter((x) => x.id !== repoId));
      showToast("Repository deleted.", "info");
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  const readyCount = repos.filter((r) => r.status === "ready").length;
  const analyzingCount = repos.filter((r) => r.status === "analyzing").length;
  const greeting = user?.email ? `Welcome back, ${user.email.split("@")[0]}` : "Welcome back";

  if (loading) return <Layout title="Dashboard"><LoadingSpinner text="Loading repositories..." /></Layout>;

  return (
    <Layout
      title="Dashboard"
      subtitle={greeting}
      actions={
        <Link to="/add-repository" className="btn btn-primary">
          <Plus size={15} /> Add Repository
        </Link>
      }
    >
      <ErrorBanner message={error} onDismiss={() => setError("")} />

      {/* Stats */}
      {repos.length > 0 && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon stat-icon-blue"><GitBranch size={18} /></div>
            <div className="stat-body">
              <div className="stat-value">{repos.length}</div>
              <div className="stat-label">Repositories</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-green"><CheckCircle size={18} /></div>
            <div className="stat-body">
              <div className="stat-value">{readyCount}</div>
              <div className="stat-label">Analyzed</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-amber"><TrendingUp size={18} /></div>
            <div className="stat-body">
              <div className="stat-value">{analyzingCount}</div>
              <div className="stat-label">In Progress</div>
            </div>
          </div>
        </div>
      )}

      {/* Repo grid */}
      {repos.length === 0 ? (
        <EmptyState
          icon={<GitBranch size={32} />}
          title="No repositories yet"
          description="Add a public GitHub repository URL to get started with AI-powered onboarding."
          action={
            <Link to="/add-repository" className="btn btn-primary">
              <Plus size={15} /> Add Your First Repository
            </Link>
          }
        />
      ) : (
        <>
          <h2 className="section-heading">
            <GitBranch size={14} /> Your Repositories
          </h2>
          <div className="repo-grid">
            {repos.map((repo) => (
              <RepoCard
                key={repo.id}
                repo={repo}
                onDelete={handleDelete}
                onTrigger={handleTrigger}
              />
            ))}
          </div>
        </>
      )}
    </Layout>
  );
}
