import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ApiCheckoutService from "@/services/api/ApiCheckoutService";

/**
 * The legacy checkout with the files of the upload fields "in the
 * checkout": without files the checkout stays
 * JSON; with files it goes as multipart, the payload as JSON in `checkout`
 * and each file in `customerUpload:<fieldId>`.
 */
describe("ApiCheckoutService.checkout", () => {
  beforeEach(() => {
    global.ApiClient = {
      post: vi.fn().mockResolvedValue({ status: 200, data: {} }),
    };
  });

  afterEach(() => {
    delete global.ApiClient;
  });

  it("posts JSON without files", async () => {
    const payload = { mail: "erika@example.test" };

    await ApiCheckoutService.checkout("t1", payload, false, { f1: [] });

    expect(global.ApiClient.post).toHaveBeenCalledWith(
      "api/t1/checkout?simulate=false",
      payload
    );
  });

  it("posts multipart with the payload and each file under its field", async () => {
    const payload = { mail: "erika@example.test" };
    const a = new File(["%PDF-1.4"], "vorne.pdf", { type: "application/pdf" });
    const b = new File(["%PDF-1.4"], "hinten.pdf", {
      type: "application/pdf",
    });

    await ApiCheckoutService.checkout("t1", payload, false, { f1: [a, b] });

    const [url, form, config] = global.ApiClient.post.mock.calls[0];
    expect(url).toBe("api/t1/checkout?simulate=false");
    expect(config.headers["Content-Type"]).toBe("multipart/form-data");
    expect(JSON.parse(form.get("checkout"))).toEqual(payload);
    expect(form.getAll("customerUpload:f1").map((file) => file.name)).toEqual([
      "vorne.pdf",
      "hinten.pdf",
    ]);
  });
});

