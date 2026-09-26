"""Repository management routes for DevOnboard AI."""
from __future__ import annotations

import logging
import os
import re
from typing import Any
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, field_validator
from supabase import create_client

from app.core.security import bearer_scheme, get_authenticated_user_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/repositories", tags=["repositories"])

GITHUB_URL_RE = re.compile(
    r"^https://github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+?)(?:\.git)?/?$"
)


def _service_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise HTTPException(500, "Supabase service role not configured")
    return create_client(url, key)


class AddRepositoryRequest(BaseModel):
    github_url: str = Field(..., description="Public GitHub repository URL")

    @field_validator("github_url")
    @classmethod
    def validate_github_url(cls, v: str) -> str:
        v = v.strip().rstrip("/")
        if not GITHUB_URL_RE.match(v):
            raise ValueError(
                "Must be a valid GitHub repository URL: https://github.com/owner/repo"
            )
        return v


def _parse_github_url(url: str) -> tuple[str, str]:
    """Return (owner, repo) from a validated GitHub URL."""
    match = GITHUB_URL_RE.match(url)
    if not match:
        raise ValueError(f"Invalid GitHub URL: {url}")
    return match.group(1), match.group(2)


@router.post("/", status_code=201)
def add_repository(
    payload: AddRepositoryRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any]:
    """Register a GitHub repository for onboarding analysis."""
    user_id = get_authenticated_user_id(credentials)
    owner, name = _parse_github_url(payload.github_url)

    client = _service_client()

    # Upsert — if already exists for this user, return existing row
    existing = (
        client.table("repositories")
        .select("*")
        .eq("user_id", user_id)
        .eq("github_url", payload.github_url)
        .maybe_single()
        .execute()
    )
    if existing is not None and getattr(existing, "data", None):

        return existing.data

    result = (
        client.table("repositories")
        .insert(
            {
                "user_id": user_id,
                "github_url": payload.github_url,
                "owner": owner,
                "name": name,
                "status": "pending",
            }
        )
        .execute()
    )
    if not result.data:
        raise HTTPException(500, "Failed to create repository record")
    return result.data[0]


@router.get("/")
def list_repositories(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any]:
    """List all repositories for the current user."""
    user_id = get_authenticated_user_id(credentials)
    client = _service_client()
    result = (
        client.table("repositories")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return {"repositories": result.data or []}


@router.get("/{repository_id}")
def get_repository(
    repository_id: str,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any]:
    """Get a single repository and its analysis status."""
    user_id = get_authenticated_user_id(credentials)
    client = _service_client()
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


@router.delete("/{repository_id}", status_code=204)
def delete_repository(
    repository_id: str,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> None:
    """Delete a repository and all associated analysis/tasks."""
    user_id = get_authenticated_user_id(credentials)
    client = _service_client()
    result = (
        client.table("repositories")
        .delete()
        .eq("id", repository_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Repository not found")
