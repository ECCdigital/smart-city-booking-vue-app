import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api/ApiClientService", () => ({
  default: { post: vi.fn() },
}));

import ApiClient from "@/services/api/ApiClientService";
import ApiAuthService from "@/services/api/ApiAuthService";

describe("ApiAuthService", () => {
  beforeEach(() => {
    ApiClient.post.mockReset();
  });

  it("requests the verification mail again, naming the return target", async () => {
    ApiClient.post.mockResolvedValue({ status: 202 });

    await ApiAuthService.resendVerification("alex@example.org", "/onboarding");

    expect(ApiClient.post).toHaveBeenCalledWith("auth/resend-verification", {
      id: "alex@example.org",
      nextUrl: "/onboarding",
    });
  });
});
