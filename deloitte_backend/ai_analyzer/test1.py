import pytest
import uuid
import time

def test_get_user_history_empty(playwright):
    api_context = playwright.request.new_context(base_url="http://127.0.0.1:8000")
    email = f"empty_history_user_{str(uuid.uuid4())}@example.com"
    password = "EmptyHistory123"
    api_context.post("/api/auth/register", data={"email": email, "password": password})
    login_response = api_context.post("/api/auth/login", data={"username": email, "password": password})
    token = login_response.json()["access_token"]

    history_response = api_context.get("/api/history", headers={"Authorization": f"Bearer {token}"})
    assert history_response.status == 200
    assert history_response.json() == []
    api_context.dispose()