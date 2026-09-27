"""Analysis trigger and results routes for Clocket AI."""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel
from supabase import create_client

from app.core.security import bearer_scheme, get_authenticated_user_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analysis", tags=["analysis"])


def _service_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise HTTPException(500, "Supabase service role not configured")
    return create_client(url, key)


def _assert_owns_repo(client, repository_id: str, user_id: str) -> dict:
    """Return the repository row or raise 404 if not owned by user."""
    result = (
        client.table("repositories")
        .select("*")
        .eq("id", repository_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Repository not found")
    return result.data


@router.post("/{repository_id}/trigger", status_code=202)
async def trigger_analysis(
    repository_id: str,
    background_tasks: BackgroundTasks,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any]:
    """Trigger repository analysis. Returns immediately; analysis runs in background."""
    user_id = get_authenticated_user_id(credentials)
    client = _service_client()
    repo = _assert_owns_repo(client, repository_id, user_id)

    if repo["status"] == "analyzing":
        return {"message": "Analysis already in progress", "status": "analyzing", "repository_id": repository_id}

    # Mark as analyzing
    client.table("repositories").update({"status": "analyzing", "error_message": None}).eq("id", repository_id).execute()

    background_tasks.add_task(_run_analysis_background, repository_id, user_id, repo["github_url"])

    return {"message": "Analysis started", "status": "analyzing", "repository_id": repository_id}


async def _run_analysis_background(repository_id: str, user_id: str, github_url: str) -> None:
    """Run the full onboarding workflow in the background."""
    try:
        from agent.graph.onboarding.workflow import run_onboarding_workflow
        await run_onboarding_workflow(
            github_url=github_url,
            repository_id=repository_id,
            user_id=user_id,
        )
    except Exception as exc:
        logger.exception("Analysis failed for repository %s: %s", repository_id, exc)
        try:
            url = os.getenv("SUPABASE_URL")
            key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            if url and key:
                client = create_client(url, key)
                client.table("repositories").update(
                    {"status": "failed", "error_message": str(exc)[:500]}
                ).eq("id", repository_id).execute()
        except Exception:
            pass


@router.get("/{repository_id}/status")
def get_analysis_status(
    repository_id: str,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any]:
    """Poll the analysis status for a repository."""
    user_id = get_authenticated_user_id(credentials)
    client = _service_client()
    repo = _assert_owns_repo(client, repository_id, user_id)
    return {
        "repository_id": repository_id,
        "status": repo["status"],
        "error_message": repo.get("error_message"),
    }


@router.get("/{repository_id}/results")
def get_analysis_results(
    repository_id: str,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any]:
    """Get the full analysis results for a repository."""
    user_id = get_authenticated_user_id(credentials)
    client = _service_client()
    repo = _assert_owns_repo(client, repository_id, user_id)

    if repo["status"] != "ready":
        return {
            "repository": repo,
            "analysis": None,
            "message": f"Analysis status: {repo['status']}",
        }

    analysis_result = (
        client.table("repository_analysis")
        .select("*")
        .eq("repository_id", repository_id)
        .maybe_single()
        .execute()
    )

    return {
        "repository": repo,
        "analysis": analysis_result.data,
    }


@router.get("/{repository_id}/tasks")
def get_onboarding_tasks(
    repository_id: str,
    difficulty: str | None = None,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any]:
    """Get all generated onboarding tasks for a repository."""
    user_id = get_authenticated_user_id(credentials)
    client = _service_client()
    _assert_owns_repo(client, repository_id, user_id)

    query = (
        client.table("onboarding_tasks")
        .select("*")
        .eq("repository_id", repository_id)
        .order("order_index")
    )
    if difficulty:
        query = query.eq("difficulty", difficulty)

    result = query.execute()
    return {"tasks": result.data or []}


@router.get("/{repository_id}/progress")
def get_progress(
    repository_id: str,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any]:
    """Get the current user's onboarding progress for a repository."""
    user_id = get_authenticated_user_id(credentials)
    client = _service_client()
    _assert_owns_repo(client, repository_id, user_id)

    progress_result = (
        client.table("onboarding_progress")
        .select("*, onboarding_tasks(title, difficulty, files_involved)")
        .eq("repository_id", repository_id)
        .eq("user_id", user_id)
        .execute()
    )
    task_result = (
        client.table("onboarding_tasks")
        .select("id, title, difficulty")
        .eq("repository_id", repository_id)
        .execute()
    )
    total = len(task_result.data or [])
    done = sum(1 for p in (progress_result.data or []) if p.get("status") == "done")

    return {
        "progress": progress_result.data or [],
        "summary": {
            "total_tasks": total,
            "completed_tasks": done,
            "percentage": round(done / total * 100) if total > 0 else 0,
        },
    }


class UpdateProgressRequest(BaseModel):
    task_id: str
    status: str
    notes: str = ""


@router.post("/{repository_id}/progress")
def update_progress(
    repository_id: str,
    payload: UpdateProgressRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any]:
    """Upsert onboarding progress for a task."""
    user_id = get_authenticated_user_id(credentials)
    client = _service_client()
    _assert_owns_repo(client, repository_id, user_id)

    valid_statuses = {"todo", "in_progress", "done", "skipped"}
    if payload.status not in valid_statuses:
        raise HTTPException(400, f"status must be one of {sorted(valid_statuses)}")

    result = (
        client.table("onboarding_progress")
        .upsert(
            {
                "user_id": user_id,
                "repository_id": repository_id,
                "task_id": payload.task_id,
                "status": payload.status,
                "notes": payload.notes,
            },
            on_conflict="user_id,task_id",
        )
        .execute()
    )
    return result.data[0] if result.data else {}


class QARequest(BaseModel):
    question: str
    conversation_id: str | None = None


@router.post("/{repository_id}/qa")
async def codebase_qa(
    repository_id: str,
    payload: QARequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any]:
    """Ask a question about the codebase. Answers are RAG-grounded with source citations."""
    user_id = get_authenticated_user_id(credentials)
    client = _service_client()
    _assert_owns_repo(client, repository_id, user_id)

    question = payload.question.strip()
    if not question:
        raise HTTPException(400, "Question must not be empty")

    try:
        from agent.rag.clocket_ai_qa import ask_codebase_question
        result = await ask_codebase_question(
            question=question,
            user_id=user_id,
            repository_id=repository_id,
        )
        return result
    except Exception as exc:
        logger.exception("Q&A failed for repository %s: %s", repository_id, exc)
        raise HTTPException(500, f"Q&A pipeline failed: {exc}") from exc
