import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/api";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe("api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("posts login credentials as form data to the access token endpoint", async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { access_token: "token" } });

    await api.logInGetToken("user@example.com", "secret");

    expect(axios.post).toHaveBeenCalledWith("/api/v1/login/access-token", expect.any(URLSearchParams));
    const params = vi.mocked(axios.post).mock.calls[0][1] as URLSearchParams;
    expect(params.get("username")).toBe("user@example.com");
    expect(params.get("password")).toBe("secret");
  });

  it("attaches bearer token config to authenticated GET requests", async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { email: "user@example.com" } });

    await api.getMe("token-1");

    expect(axios.get).toHaveBeenCalledWith("/api/v1/users/me", {
      timeout: 30000,
      headers: {
        Authorization: "Bearer token-1",
      },
    });
  });

  it("uses the report timeout and cancel token when executing a report", async () => {
    const cancelTokenSource = { token: "cancel-token" };
    const request = { dimensions: ["year"] };
    vi.mocked(axios.post).mockResolvedValue({ data: { data: [] } });

    await api.executeReport("token-2", 7, request as any, cancelTokenSource);

    expect(axios.post).toHaveBeenCalledWith("/api/v1/warehouse/7/execute", request, {
      timeout: 600000,
      headers: {
        Authorization: "Bearer token-2",
      },
      cancelToken: "cancel-token",
    });
  });
});
