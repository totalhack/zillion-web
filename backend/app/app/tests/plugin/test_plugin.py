from fastapi.testclient import TestClient
from tlbx import st, pp


def test_plugin_execute_text(client: TestClient, plugin_token_headers: dict):
    # We now allow this through at localhost since ChatGPT requires that
    # for plugin dev.
    # resp = client.post(
    #     "/plugin/execute_text/",
    #     json={"text": "This should fail!"},
    # )
    # assert resp.status_code == 403

    resp = client.post(
        "/plugin/execute_text/",
        headers=plugin_token_headers,
        json={"text": "Home runs by year for the last 10 years"},
    )
    assert resp.status_code == 200
    data = resp.json()
    pp(data)
