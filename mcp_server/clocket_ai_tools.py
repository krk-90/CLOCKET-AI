"""Clocket AI custom MCP tools.

These tools provide Clocket AI-specific persistence operations:
  - save_repository_analysis   : persist analysis JSON to Supabase
  - get_onboarding_progress    : read task completion state
  - update_onboarding_task     : mark task status

GitHub MCP handles all GitHub API calls — no custom tools duplicate that.
Task MCP (mcp_server/tools.py) handles general task CRUD — unchanged.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any

from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP
from supabase import Client, create_client

load_dotenv()
logger = logging.getLogger(__name__)

mcp = FastMCP(
    "clocket-ai",
    host=os.getenv("CLOCKET_AI_MCP_HOST", "127.0.0.1"),
    port=int(os.getenv("CLOCKET_AI_MCP_PORT", "8002")),
)

_CLIENT: Client | None = None


def _get_client() -> Client:
    global _CLIENT
    if _CLIENT is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required")
        _CLIENT = create_client(url, key)
    return _CLIENT


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@mcp.tool()
def save_repository_analysis(
    repository_id: str,
    architecture: dict | None = None,
    technology_stack: dict | None = None,
    dependencies: dict | None = None,
    configuration: dict | None = None,
    apis: list | None = None,
    database_info: dict | None = None,
    setup_guide: list | None = None,
    setup_issues: list | None = None,
    onboarding_plan: str = "",
    directory_structure: list | None = None,
    important_files: list | None = None,
    entry_points: dict | None = None,
) -> dict[str, Any]:
    """Persist the full repository analysis to Supabase."""
    client = _get_client()
    payload: dict[str, Any] = {
        "repository_id": repository_id,
        "architecture": architecture or {},
        "technology_stack": technology_stack or {},
        "dependencies": dependencies or {},
        "configuration": configuration or {},
        "apis": apis or [],
        "database_info": database_info or {},
        "setup_guide": setup_guide or [],
        "setup_issues": setup_issues or [],
        "onboarding_plan": onboarding_plan,
        "directory_structure": directory_structure or [],
        "important_files": important_files or [],
        "entry_points": entry_points or {},
        "generated_at": _utc_now(),
    }
    result = (
        client.table("repository_analysis")
        .upsert(payload, on_conflict="repository_id")
        .execute()
    )
    # Mark repository as ready
    client.table("repositories").update({"status": "ready"}).eq("id", repository_id).execute()
    return result.data[0] if result.data else {"repository_id": repository_id}


@mcp.tool()
def save_onboarding_tasks(
    repository_id: str,
    tasks: list[dict],
) -> dict[str, Any]:
    """Persist generated onboarding tasks to Supabase.

    Each task dict should have: title, description, difficulty, estimated_effort,
    skills, files_involved, reason, acceptance_criteria.
    """
    client = _get_client()
    # Delete existing tasks first (regeneration scenario)
    client.table("onboarding_tasks").delete().eq("repository_id", repository_id).execute()

    rows = []
    for idx, task in enumerate(tasks):
        rows.append(
            {
                "repository_id": repository_id,
                "title": task.get("title", ""),
                "description": task.get("description", ""),
                "difficulty": task.get("difficulty", "beginner"),
                "estimated_effort": task.get("estimated_effort", ""),
                "skills": task.get("skills", []),
                "files_involved": task.get("files_involved", []),
                "reason": task.get("reason", ""),
                "acceptance_criteria": task.get("acceptance_criteria", []),
                "order_index": idx,
            }
        )

    if rows:
        result = client.table("onboarding_tasks").insert(rows).execute()
        return {"saved": len(result.data or []), "repository_id": repository_id}
    return {"saved": 0, "repository_id": repository_id}


@mcp.tool()
def get_onboarding_progress(
    user_id: str,
    repository_id: str,
) -> dict[str, Any]:
    """Get the user's onboarding task progress for a repository."""
    client = _get_client()
    progress = (
        client.table("onboarding_progress")
        .select("*, onboarding_tasks(title, difficulty)")
        .eq("user_id", user_id)
        .eq("repository_id", repository_id)
        .execute()
    )
    total_tasks = (
        client.table("onboarding_tasks")
        .select("id", count="exact")
        .eq("repository_id", repository_id)
        .execute()
    )
    total = total_tasks.count or 0
    done = sum(1 for p in (progress.data or []) if p.get("status") == "done")
    return {
        "progress": progress.data or [],
        "total_tasks": total,
        "completed_tasks": done,
        "percentage": round(done / total * 100) if total > 0 else 0,
    }


@mcp.tool()
def update_onboarding_task(
    user_id: str,
    repository_id: str,
    task_id: str,
    status: str,
    notes: str = "",
) -> dict[str, Any]:
    """Update a user's onboarding task status (todo|in_progress|done|skipped)."""
    valid = {"todo", "in_progress", "done", "skipped"}
    if status not in valid:
        raise ValueError(f"status must be one of {sorted(valid)}")

    client = _get_client()
    result = (
        client.table("onboarding_progress")
        .upsert(
            {
                "user_id": user_id,
                "repository_id": repository_id,
                "task_id": task_id,
                "status": status,
                "notes": notes,
            },
            on_conflict="user_id,task_id",
        )
        .execute()
    )
    return result.data[0] if result.data else {"task_id": task_id, "status": status}


if __name__ == "__main__":
    mcp.run(transport=os.getenv("CLOCKET_AI_MCP_TRANSPORT", "stdio"))


__all__ = [
    "mcp",
    "save_repository_analysis",
    "save_onboarding_tasks",
    "get_onboarding_progress",
    "update_onboarding_task",
]
