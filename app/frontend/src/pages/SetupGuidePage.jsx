import React from "react";
import { useParams, Link } from "react-router-dom";
import { AuthContext, apiFetch } from "../main.jsx";
import { Layout, LoadingSpinner, ErrorBanner } from "../components/Layout.jsx";
import { Terminal, AlertTriangle, CheckCircle, ChevronDown, ChevronRight, Copy } from "lucide-react";

function CopyBtn({ text }) {
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
    <button type="button" className="copy-btn" onClick={copy} title={copied ? "Copied" : "Copy"} aria-label={copied ? "Copied to clipboard" : "Copy to clipboard"}>
      {copied ? <CheckCircle size={13} /> : <Copy size={13} />}
    </button>
  );
}

function SetupStep({ step, index }) {
  const [expanded, setExpanded] = React.useState(index < 3);
  const isStepObject = step !== null && typeof step === "object";
  const title = typeof step === "string" ? step : (isStepObject ? step.title || `Step ${index + 1}` : `Step ${index + 1}`);
  const description = isStepObject ? (step.description || "") : "";
  const commands = isStepObject && Array.isArray(step.commands) ? step.commands : [];
  const notes = isStepObject ? (step.notes || "") : "";
  const stepNum = isStepObject ? (step.step || index + 1) : (index + 1);
  const bodyId = `setup-step-${index}-body`;

  return (
    <div className="setup-step">
      <button
        type="button"
        className="setup-step-header"
        onClick={() => setExpanded((expanded) => !expanded)}
        aria-expanded={expanded}
        aria-controls={bodyId}
      >
        <span className="step-number">{stepNum}</span>
        <span className="step-title">{title}</span>
        <span className="step-toggle">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>
      {expanded && (
        <div className="setup-step-body" id={bodyId}>
          {description && <p className="step-desc">{description}</p>}
          {commands.length > 0 && (
            <div className="commands-block">
              <div className="commands-header">
                <span className="commands-header-label">bash</span>
                <CopyBtn text={commands.join("\n")} />
              </div>
              {commands.map((cmd, i) => (
                <div key={i} className="command-line">
                  <code>{cmd}</code>
                  <CopyBtn text={cmd} />
                </div>
              ))}
            </div>
          )}
          {notes && <p className="step-notes">{notes}</p>}
        </div>
      )}
    </div>
  );
}

export default function SetupGuidePage() {
  const { token } = React.useContext(AuthContext);
  const { repoId } = useParams();
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    apiFetch(`/analysis/${repoId}/results`, {}, token)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [repoId, token]);

  if (loading) return <Layout title="Setup Guide"><LoadingSpinner /></Layout>;

  const repo = data?.repository;
  const analysis = data?.analysis;
  const setupSteps = analysis?.setup_guide || [];
  const envVars = analysis?.configuration?.env_vars || [];
  const issues = analysis?.setup_issues || [];
  const stack = analysis?.technology_stack || {};

  return (
    <Layout
      title="Setup Guide"
      subtitle="Step-by-step instructions to get the project running"
      breadcrumb={[
        { to: "/dashboard", label: "Dashboard" },
        { to: `/repository/${repoId}`, label: `${repo?.owner}/${repo?.name}` },
        { label: "Setup Guide" },
      ]}
    >
      <ErrorBanner message={error} onDismiss={() => setError("")} />

      {!analysis && (
        <div className="card card-amber">
          <p className="text-sm">Analysis not yet available. Return to the <Link to={`/repository/${repoId}`} className="text-accent">overview</Link> to check status.</p>
        </div>
      )}

      {/* Tech stack summary */}
      {analysis?.technology_stack && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><Terminal size={15} className="card-title-icon" /> Prerequisites</h3>
          </div>
          <div className="tag-list">
            {Object.entries(stack.languages || {}).slice(0, 5).map(([lang]) => (
              <span key={lang} className="tag tag-purple">{lang}</span>
            ))}
            {(stack.frameworks || []).map((f) => (
              <span key={f} className="tag tag-blue">{f}</span>
            ))}
            {(stack.infrastructure || []).map((i) => (
              <span key={i} className="tag">{i}</span>
            ))}
          </div>
        </div>
      )}

      {/* Setup steps */}
      {setupSteps.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><Terminal size={15} className="card-title-icon" /> Setup Steps</h3>
            <span className="text-muted text-xs">{setupSteps.length} steps</span>
          </div>
          <div className="setup-steps">
            {setupSteps.map((step, i) => (
              <SetupStep key={i} step={step} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Environment variables */}
      {envVars.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><Terminal size={15} className="card-title-icon" /> Environment Variables</h3>
            <span className="text-muted text-xs">{envVars.length} variables</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="env-table">
              <thead>
                <tr><th>Variable</th><th>Required</th><th>Description</th></tr>
              </thead>
              <tbody>
                {envVars.map((v, vi) => {
                  const name = typeof v === "string" ? v : v.name;
                  const required = typeof v === "object" ? v.required : true;
                  const desc = typeof v === "object" ? (v.description || v.desc || "") : "";
                  return (
                    <tr key={vi}>
                      <td>
                        <code className="font-mono">{name}</code>
                      </td>
                      <td>
                        {required !== false
                          ? <span className="badge-required">required</span>
                          : <span className="badge-optional">optional</span>
                        }
                      </td>
                      <td className="text-muted">{desc || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Configuration issues */}
      {issues.length > 0 && (
        <div className="card card-amber">
          <div className="card-header">
            <h3 className="card-title">
              <AlertTriangle size={15} style={{ color: "var(--amber)" }} />
              Configuration Findings
            </h3>
          </div>
          <div className="issues-list">
            {issues.map((issue, i) => (
              <div key={i} className={`issue-item severity-${issue.severity || "low"}`}>
                <span className="issue-type">{(issue.type || "").replace(/_/g, " ")}</span>
                <span>{issue.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {setupSteps.length === 0 && analysis && (
        <div className="card">
          <p className="text-muted text-sm">No setup steps were generated. The repository may not contain sufficient configuration files.</p>
        </div>
      )}
    </Layout>
  );
}
