import { beforeEach, describe, expect, it, vi } from "vitest";

const doubles = vi.hoisted(() => ({
  dispatch: vi.fn(),
  me: vi.fn(),
  bffMode: false,
  endAdminSession: vi.fn(),
}));

vi.mock("@/store/index", () => ({
  default: { dispatch: (...args) => doubles.dispatch(...args) },
}));
vi.mock("@/services/api/ApiAuthService", () => ({
  default: { me: (...args) => doubles.me(...args) },
}));
vi.mock("@/services/auth/authMode", () => ({
  isBffAuthMode: () => doubles.bffMode,
}));
vi.mock("@/services/auth/sessionSync", () => ({
  endAdminSession: (...args) => doubles.endAdminSession(...args),
}));

const { requiresAuth } = await import("@/router/middlewares/auth");

/** A pasted Buchungslink, as the router hands it to the middleware. */
const BOOKING_LINK = {
  name: "booking-details",
  fullPath: "/bookings/abc?tenant=t",
  meta: { requiresAuth: true },
};

beforeEach(() => {
  doubles.dispatch = vi.fn();
  doubles.me = vi.fn(async () => ({ data: { user: {}, permissions: {} } }));
  doubles.bffMode = false;
  doubles.endAdminSession = vi.fn();
});

describe("requiresAuth", () => {
  it("lets a signed-in user through", async () => {
    const next = vi.fn();

    await requiresAuth({ to: BOOKING_LINK, next });

    expect(next).toHaveBeenCalledWith();
  });

  it("sends a logged-out visitor to login with the full path to return to", async () => {
    doubles.me = vi.fn(async () => {
      throw new Error("401");
    });
    const next = vi.fn();

    await requiresAuth({ to: BOOKING_LINK, next });

    expect(next).toHaveBeenCalledWith({
      name: "login",
      query: { next: "/bookings/abc?tenant=t" },
    });
  });

  it("lets the BFF transport end the session, naming the page to return to", async () => {
    doubles.bffMode = true;
    doubles.me = vi.fn(async () => {
      throw new Error("401");
    });
    const next = vi.fn();

    await requiresAuth({ to: BOOKING_LINK, next });

    expect(doubles.endAdminSession).toHaveBeenCalledWith({
      redirect: true,
      next: "/bookings/abc?tenant=t",
    });
    expect(next).toHaveBeenCalledWith(false);
  });
});

describe("requiresAuth — the public entry „Mandant anlegen“", () => {
  /** The link the storefront points to, opened by a signed-out visitor. */
  const ONBOARDING = {
    name: "tenant-onboarding",
    fullPath: "/onboarding",
    meta: { requiresAuth: true, publicEntry: true },
  };

  beforeEach(() => {
    doubles.me = vi.fn(async () => {
      throw new Error("401");
    });
  });

  it("leads a signed-out visitor to the login, keeping the setup as target", async () => {
    const next = vi.fn();

    await requiresAuth({ to: ONBOARDING, next });

    expect(next).toHaveBeenCalledWith({
      name: "login",
      query: { next: "/onboarding" },
    });
  });

  it("does not tell a visitor who never signed in that a session expired", async () => {
    await requiresAuth({ to: ONBOARDING, next: vi.fn() });

    expect(doubles.dispatch).not.toHaveBeenCalledWith(
      "toasts/add",
      expect.anything()
    );
  });

  it("still tells it on every other page", async () => {
    await requiresAuth({ to: BOOKING_LINK, next: vi.fn() });

    expect(doubles.dispatch).toHaveBeenCalledWith(
      "toasts/add",
      expect.objectContaining({ type: "error" })
    );
  });
});
