async def test_register_login_me_refresh_logout(client):
    body = {"email": "a@b.com", "password": "password123", "full_name": "A"}
    r = await client.post("/api/auth/register", json=body)
    assert r.status_code == 201 and "fv_refresh" in r.headers["set-cookie"] and "HttpOnly" in r.headers["set-cookie"]

    assert (await client.post("/api/auth/register", json=body)).json()["error"]["code"] == "email_taken"

    r = await client.post("/api/auth/login", json={"email": "A@B.com", "password": "password123"})
    token = r.json()["access_token"]
    me = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.json()["email"] == "a@b.com"

    assert (await client.post("/api/auth/refresh")).status_code == 200
    await client.post("/api/auth/logout")
    client.cookies.clear()
    assert (await client.post("/api/auth/refresh")).status_code == 401


async def test_bad_credentials_and_validation(client):
    r = await client.post("/api/auth/login", json={"email": "no@one.com", "password": "whatever1"})
    assert r.status_code == 401 and r.json()["error"]["code"] == "invalid_credentials"
    r = await client.post("/api/auth/register", json={"email": "bad", "password": "short", "full_name": ""})
    assert r.status_code == 422 and r.json()["error"]["code"] == "validation_error"


async def test_protected_routes_require_auth(client):
    for path in ("/api/auth/me", "/api/dashboard", "/api/analyses", "/api/profile"):
        assert (await client.get(path)).status_code == 401
    bad = await client.get("/api/auth/me", headers={"Authorization": "Bearer garbage"})
    assert bad.status_code == 401
