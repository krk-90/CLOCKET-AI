import React from "react";
import { useParams, Link } from "react-router-dom";
import { AuthContext, apiFetch } from "../main.jsx";
import { Layout, LoadingSpinner, ErrorBanner, CopyButton } from "../components/Layout.jsx";
import { Layers, Box, Server, GitBranch } from "lucide-react";

function ArchGraph({ architecture }) {
  const LAYER_CONFIG = {
    frontend: { label: "Frontend", color: "#3b82f6" },
    backend: { label: "Backend", color: "#7c3aed" },
    database: { label: "Database", color: "#16a34a" },
    authentication: { label: "Auth", color: "#d97706" },
    deployment: { label: "Deployment", color: "#64748b" },
    external_services: { label: "External", color: "#ec4899" },
    testing: { label: "Testing", color: "#0891b2" },
    tooling: { label: "Tooling", color: "#9333ea" },
  };

  const sections = Object.entries(LAYER_CONFIG)
    .map(([key, conf]) => ({ key, ...conf, items: Array.isArray(architecture?.[key]) ? architecture[key] : [] }))
    .filter((s) => s.items.length > 0);

  if (sections.length === 0) {
    return <p className="text-muted text-sm">Architecture details not available.</p>;
  }

  return (
    <div className="arch-graph">
      {sections.map((section) => (
        <div key={section.key} className="arch-layer">
          <div className="arch-layer-label" style={{ color: section.color }}>
            {section.label}
          </div>
          <div className="arch-layer-items">
            {section.items.map((item, i) => (
              <div key={i} className="arch-node" style={{ borderColor: section.color, color: section.color }}>
                {item}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ArchitecturePage() {
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

  if (loading) return <Layout title="Architecture"><LoadingSpinner /></Layout>;

  const repo = data?.repository;
  const arch = data?.analysis?.architecture || {};
  const summary = arch.summary || "";
  const dataFlows = arch.data_flow || [];
  const apis = data?.analysis?.apis || [];

  return (
    <Layout
      title="Architecture"
      subtitle="System design and component relationships"
      breadcrumb={[
        { to: "/dashboard", label: "Dashboard" },
        { to: `/repository/${repoId}`, label: `${repo?.owner}/${repo?.name}` },
        { label: "Architecture" },
      ]}
    >
      <ErrorBanner message={error} onDismiss={() => setError("")} />

      {!data?.analysis && (
        <div className="card card-amber">
          <p className="text-sm">Analysis not yet available. Return to the <Link to={`/repository/${repoId}`} className="text-accent">overview</Link> to check status.</p>
        </div>
      )}

      {summary && (
        <div className="card card-accent">
          <div className="card-header">
            <h3 className="card-title"><Layers size={15} className="card-title-icon" /> Architecture Summary</h3>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8 }}>{summary}</p>
        </div>
      )}

      {data?.analysis && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><Box size={15} className="card-title-icon" /> Component Layers</h3>
          </div>
          <ArchGraph architecture={arch} />
        </div>
      )}

      {dataFlows.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><GitBranch size={15} className="card-title-icon" /> Data Flow</h3>
          </div>
          <ol className="flow-list">
            {dataFlows.map((flow, i) => (
              <li key={i}>{flow}</li>
            ))}
          </ol>
        </div>
      )}

      {apis.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Server size={15} className="card-title-icon" />
              Detected API Endpoints
              <span className="badge badge-blue" style={{ marginLeft: 6 }}>{apis.length}</span>
            </h3>
          </div>
          <div className="api-table-wrap">
            <table className="api-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Path</th>
                  <th>File</th>
                </tr>
              </thead>
              <tbody>
                {apis.slice(0, 60).map((api, i) => (
                  <tr key={i}>
                    <td>
                      <span className={`method-badge method-${(api.method || "GET").toLowerCase()}`}>
                        {api.method || "GET"}
                      </span>
                    </td>
                    <td className="font-mono text-sm">{api.path}</td>
                    <td className="text-muted text-xs">{api.file}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {apis.length > 60 && (
              <p className="text-muted text-xs" style={{ padding: "8px 12px" }}>
                Showing first 60 of {apis.length} endpoints.
              </p>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
