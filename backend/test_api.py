"""Tests for Momentra API v1 endpoints."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_health_endpoint(client):
    """Test that the health check endpoint works."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "Momentra" in data["service"]


@pytest.mark.asyncio
async def test_root_endpoint(client):
    """Test that the root endpoint returns API info."""
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "Momentra"
    assert "docs" in data


@pytest.mark.asyncio
async def test_openapi_docs_available(client):
    """Test that OpenAPI docs are accessible."""
    response = await client.get("/openapi.json")
    assert response.status_code == 200
    data = response.json()
    assert "paths" in data
    assert "/api/v1/auth/firebase/exchange" in str(data["paths"])


@pytest.mark.asyncio
async def test_auth_requires_token(client):
    """Test that protected endpoints return 401 without token."""
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_moments_requires_token(client):
    """Test that moments endpoint returns 401 without token."""
    response = await client.get("/api/v1/moments")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_personal_requires_token(client):
    """Test that personal endpoints return 401 without token."""
    response = await client.get("/api/v1/personal/dashboard?moment_id=00000000-0000-0000-0000-000000000000")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_groups_requires_token(client):
    """Test that group endpoints return 401 without token."""
    response = await client.get("/api/v1/groups/00000000-0000-0000-0000-000000000000/expenses")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_business_requires_token(client):
    """Test that business endpoints return 401 without token."""
    response = await client.get("/api/v1/businesses/00000000-0000-0000-0000-000000000000/dashboard")
    assert response.status_code == 401
