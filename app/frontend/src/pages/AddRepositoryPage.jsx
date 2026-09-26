import React from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext, apiFetch } from "../main.jsx";
import { Layout, ErrorBanner, useToast } from "../components/Layout.jsx";
import { GitBranch, Plus, Info, Code, Package } from "lucide-react";

const EXAMPLE_REPOS = [
  "https://github.com/tiangolo/fastapi",
  "https://github.com/pallets/flask",
  "https://github.com/vercel/next.js",
  "https://github.com/django/django",
];

const STEPS = [
  {
    title: "Repository cloned",
    desc: "We clone the repo with depth 1 for fast analysis.",
  },
  {
    title: "Static scanning",
    desc: "Languages, frameworks, APIs, and env vars are detected deterministically.",
  },
  {
    title: "AI analysis",
    desc: "Architecture, setup guide, onboarding plan, and starter tasks are generated.",
  },
  {
    title: "RAG indexing",
    desc: "Files are chunked and indexed for the Codebase Q&A feature.",
  },
  {
    title: "Results saved",
    desc: "Everything is persisted to your account in Supabase.",
  },
];

export default function AddRepositoryPage() {
  const { token } = React.useContext(AuthContext);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [url, setUrl] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const repo = await apiFetch(
        "/repositories/",
        { method: "POST", body: JSON.stringify({ github_url: url.trim() }) },
        token
      );
      await apiFetch(`/analysis/${repo.id}/trigger`, { method: "POST" }, token);
      showToast("Repository added — analysis started!", "success");
      navigate(`/repository/${repo.id}/analyzing`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Layout
      title="Add Repository"
      subtitle="Add a public GitHub repository to analyze"
      breadcrumb={[{ to: "/dashboard", label: "Dashboard" }, { label: "Add Repository" }]}
    >
      <div className="add-repo-wrap">
        {/* Form */}
        <div>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <GitBranch size={16} className="card-title-icon" />
                GitHub Repository URL
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="form">
              <div className="field">
                <label className="field-label" htmlFor="repository-url">Repository URL</label>
                <input
                  id="repository-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://github.com/owner/repository"
                  required
                  autoFocus
                />
                <span className="field-hint">
                  Must be a public repository: https://github.com/owner/repo
                </span>
              </div>

              <ErrorBanner message={error} onDismiss={() => setError("")} />

              <button
                type="submit"
                disabled={busy || !url.trim()}
                className="btn btn-primary btn-full"
              >
                {busy ? (
                  <><span className="spinner-sm" /> Adding repository...</>
                ) : (
                  <><Plus size={15} /> Add Repository &amp; Start Analysis</>
                )}
              </button>
            </form>
          </div>

          {/* Example repos */}
          <div className="card card-flat" style={{ background: "var(--surface)" }}>
            <div className="card-title" style={{ marginBottom: 10 }}>
              <Code size={14} className="card-title-icon" />
              Try an example
            </div>
            <div className="example-repos-grid">
              {EXAMPLE_REPOS.map((ex) => (
                <button
                  key={ex}
                  className="btn btn-secondary btn-sm"
                  onClick={() => setUrl(ex)}
                >
                  {ex.replace("https://github.com/", "")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Info panel */}
        <div>
          <div className="card card-accent">
            <div className="card-title" style={{ marginBottom: 12 }}>
              <Info size={15} style={{ color: "var(--accent)" }} />
              What happens next
            </div>
            <div className="add-repo-info">
              {STEPS.map((s, i) => (
                <div key={i} className="add-repo-step">
                  <div className="add-repo-step-num">{i + 1}</div>
                  <div>
                    <div className="add-repo-step-title">{s.title}</div>
                    <div className="add-repo-step-desc">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ background: "var(--surface)", boxShadow: "none" }}>
            <div className="card-title" style={{ marginBottom: 8 }}>
              <Package size={14} className="card-title-icon" />
              Requirements
            </div>
            <ul style={{ paddingLeft: 16, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.8 }}>
              <li>Repository must be <strong>public</strong></li>
              <li>Must be hosted on <strong>github.com</strong></li>
              <li>Analysis takes <strong>2–5 minutes</strong></li>
              <li>Results are stored to your account</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}
