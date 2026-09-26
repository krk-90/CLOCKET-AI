import React from "react";
import { useParams } from "react-router-dom";
import { AuthContext, apiFetch } from "../main.jsx";
import { Layout, StatusBadge, LoadingSpinner, ErrorBanner, EmptyState, useToast } from "../components/Layout.jsx";
import { ListTodo, FileText, Tag, Clock, ChevronDown, ChevronRight } from "lucide-react";

function TaskCard({ task, progressStatus, onStatusChange }) {
  const [expanded, setExpanded] = React.useState(false);

  const diffClass = {
    beginner: "diff-beginner",
    intermediate: "diff-intermediate",
    advanced: "diff-advanced",
  }[task.difficulty] || "";
  const detailsId = `task-${task.id}-details`;

  return (
    <div className="task-card">
      <div className="task-card-header">
        <button
          type="button"
          className="task-header-toggle"
          onClick={() => setExpanded((expanded) => !expanded)}
          aria-expanded={expanded}
          aria-controls={detailsId}
        >
          <div className="task-header-left">
            <div className={`difficulty-indicator ${diffClass}`} />
            <div className="task-main">
              <div className="task-title">{task.title}</div>
              <div className="task-meta">
                <StatusBadge status={task.difficulty} />
                {task.estimated_effort && (
                  <span className="text-muted text-xs" style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <Clock size={11} /> {task.estimated_effort}
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>
        <div className="task-header-right">
          <select
            className="progress-select"
            aria-label={`Update progress for ${task.title}`}
            value={progressStatus}
            onChange={(e) => { e.stopPropagation(); onStatusChange(task.id, e.target.value); }}
            onClick={(e) => e.stopPropagation()}
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
            <option value="skipped">Skip</option>
          </select>
          <span className="task-expand-btn" aria-hidden="true">
            {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="task-card-body" id={detailsId}>
          <p>{task.description}</p>

          {task.files_involved?.length > 0 && (
            <div className="task-section">
              <div className="task-section-title"><FileText size={12} /> Files Involved</div>
              <div className="file-tags">
                {task.files_involved.map((f) => (
                  <span key={f} className="tag tag-dark text-xs font-mono">{f}</span>
                ))}
              </div>
            </div>
          )}

          {task.skills?.length > 0 && (
            <div className="task-section">
              <div className="task-section-title"><Tag size={12} /> Skills Needed</div>
              <div className="skill-tags">
                {task.skills.map((s) => <span key={s} className="tag tag-blue text-xs">{s}</span>)}
              </div>
            </div>
          )}

          {task.acceptance_criteria?.length > 0 && (
            <div className="task-section">
              <div className="task-section-title">✓ Acceptance Criteria</div>
              <ul className="criteria-list">
                {task.acceptance_criteria.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}

          {task.reason && (
            <div className="task-reason">
              <strong>Why this task:</strong> {task.reason}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function StarterTasksPage() {
  const { token } = React.useContext(AuthContext);
  const { repoId } = useParams();
  const { showToast } = useToast();
  const [tasks, setTasks] = React.useState([]);
  const [progressMap, setProgressMap] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [filter, setFilter] = React.useState("all");

  React.useEffect(() => {
    Promise.all([
      apiFetch(`/analysis/${repoId}/tasks`, {}, token),
      apiFetch(`/analysis/${repoId}/progress`, {}, token),
    ])
      .then(([tasksData, progressData]) => {
        setTasks(tasksData.tasks || []);
        const map = {};
        for (const p of progressData.progress || []) map[p.task_id] = p;
        setProgressMap(map);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [repoId, token]);

  async function handleStatusChange(taskId, status) {
    const prev = progressMap[taskId]?.status || "todo";
    setProgressMap((m) => ({ ...m, [taskId]: { ...(m[taskId] || {}), task_id: taskId, status } }));
    try {
      await apiFetch(
        `/analysis/${repoId}/progress`,
        { method: "POST", body: JSON.stringify({ task_id: taskId, status }) },
        token
      );
      if (status === "done") showToast("Task marked as done! 🎉", "success");
    } catch (err) {
      setProgressMap((m) => ({ ...m, [taskId]: { ...(m[taskId] || {}), task_id: taskId, status: prev } }));
      showToast(err.message, "error");
    }
  }

  if (loading) return <Layout title="Starter Tasks"><LoadingSpinner /></Layout>;

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.difficulty === filter);
  const counts = {
    all: tasks.length,
    beginner: tasks.filter((t) => t.difficulty === "beginner").length,
    intermediate: tasks.filter((t) => t.difficulty === "intermediate").length,
    advanced: tasks.filter((t) => t.difficulty === "advanced").length,
  };
  const done = Object.values(progressMap).filter((p) => p.status === "done").length;
  return (
    <Layout
      title="Starter Tasks"
      subtitle="AI-generated tasks grounded in real repository files"
      breadcrumb={[
        { to: "/dashboard", label: "Dashboard" },
        { to: `/repository/${repoId}`, label: "Repository" },
        { label: "Starter Tasks" },
      ]}
    >
      <ErrorBanner message={error} onDismiss={() => setError("")} />

      {tasks.length > 0 && (
        <div className="task-progress-summary">
          <div>
            <div className="task-progress-fraction">{done}/{tasks.length}</div>
            <div className="task-progress-label">tasks completed</div>
          </div>
          <div className="task-progress-bar-wrap">
            <div
              className="task-progress-bar"
              style={{ width: `${tasks.length > 0 ? (done / tasks.length) * 100 : 0}%` }}
            />
          </div>
          <span className="badge badge-blue">
            {Math.round(tasks.length > 0 ? (done / tasks.length) * 100 : 0)}%
          </span>
        </div>
      )}

      <div className="filter-bar">
        <div className="filter-tabs">
          {[
            { key: "all", label: "All" },
            { key: "beginner", label: "Beginner" },
            { key: "intermediate", label: "Intermediate" },
            { key: "advanced", label: "Advanced" },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`filter-tab ${filter === key ? "active" : ""}`}
              onClick={() => setFilter(key)}
            >
              {label}
              <span className="filter-count">{counts[key]}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ListTodo size={28} />}
          title={tasks.length === 0 ? "No tasks yet" : `No ${filter} tasks`}
          description={tasks.length === 0
            ? "Tasks are generated after repository analysis completes."
            : `There are no ${filter} difficulty tasks for this repository.`
          }
        />
      ) : (
        <div className="tasks-list">
          {filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              progressStatus={progressMap[task.id]?.status || "todo"}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </Layout>
  );
}
