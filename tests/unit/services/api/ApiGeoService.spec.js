import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api/ApiClientService", () => ({
  default: { get: vi.fn() },
}));

import ApiClient from "@/services/api/ApiClientService";
import ApiGeoService from "@/services/api/ApiGeoService";

const HIT = {
  address: {
    street: "Gasstraße",
    house_number: "4",
    postcode: "03172",
    city: "Guben",
    country_code: "DE",
  },
  coordinates: { type: "Point", points: [14.714485, 51.950438] },
  display_address: "Gasstraße 4, 03172 Guben",
};

describe("ApiGeoService", () => {
  beforeEach(() => {
    ApiClient.get.mockReset();
  });

  it("searches in the tenant with the focus and answers the hits", async () => {
    ApiClient.get.mockResolvedValue({ data: { success: true, data: [HIT] } });

    const hits = await ApiGeoService.search("t1", {
      q: "Gasstraße 4",
      lat: 51.95,
      lon: 14.71,
      lang: "de",
    });

    expect(ApiClient.get).toHaveBeenCalledWith("api/v2/t1/geo/search", {
      params: { q: "Gasstraße 4", lat: 51.95, lon: 14.71, lang: "de" },
    });
    expect(hits).toEqual([HIT]);
  });

  it("leaves the focus out while the map has none", async () => {
    ApiClient.get.mockResolvedValue({ data: { success: true, data: [] } });

    await ApiGeoService.search("t1", { q: "Guben", lang: "de" });

    expect(ApiClient.get).toHaveBeenCalledWith("api/v2/t1/geo/search", {
      params: { q: "Guben", lang: "de" },
    });
  });

  it("asks for the address at a point and answers one hit or null", async () => {
    ApiClient.get.mockResolvedValueOnce({ data: { success: true, data: HIT } });
    ApiClient.get.mockResolvedValueOnce({
      data: { success: true, data: null },
    });

    const found = await ApiGeoService.reverse("t1", {
      lat: 51.95,
      lon: 14.71,
      lang: "de",
    });
    const none = await ApiGeoService.reverse("t1", { lat: 0, lon: 0 });

    expect(ApiClient.get).toHaveBeenNthCalledWith(1, "api/v2/t1/geo/reverse", {
      params: { lat: 51.95, lon: 14.71, lang: "de" },
    });
    expect(found).toEqual(HIT);
    expect(none).toBeNull();
  });

  it("reads the start view of the tenant's map", async () => {
    ApiClient.get.mockResolvedValue({
      data: { success: true, data: { lat: 51.9, lon: 14.7, zoom: 12 } },
    });

    const view = await ApiGeoService.start("t 1");

    expect(ApiClient.get).toHaveBeenCalledWith("api/v2/t%201/geo/start");
    expect(view).toEqual({ lat: 51.9, lon: 14.7, zoom: 12 });
  });

  it("loads a tile as a blob through the API client, abortable", async () => {
    const blob = new Blob(["png"], { type: "image/png" });
    const signal = new AbortController().signal;
    ApiClient.get.mockResolvedValue({ data: blob });

    const tile = await ApiGeoService.tile(
      "t1",
      { z: 12, x: 2210, y: 1350 },
      {
        signal,
      }
    );

    expect(ApiClient.get).toHaveBeenCalledWith(
      "api/v2/t1/geo/tiles/12/2210/1350",
      { responseType: "blob", signal }
    );
    expect(tile).toBe(blob);
  });

  it("lets a failure reach the caller, a 503 among them", async () => {
    const unavailable = Object.assign(new Error("503"), {
      response: { status: 503, data: { code: "geo_search_unavailable" } },
    });
    ApiClient.get.mockRejectedValue(unavailable);

    await expect(ApiGeoService.search("t1", { q: "Guben" })).rejects.toBe(
      unavailable
    );
  });
});
