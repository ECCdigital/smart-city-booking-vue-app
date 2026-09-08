import { describe, expect, it } from "vitest";
import { tenantUserOptions } from "@/utils/tenantUsers";

/**
 * `GET /api/:tenant/users` hands the memberships and the profiles back
 * separately. Three screens offer tenant members as a choice and all of them
 * have to join the two the same way, so the join lives here.
 */
describe("tenantUserOptions", () => {
  it("joins a membership with its profile", () => {
    expect(
      tenantUserOptions({
        users: [{ userId: "anna@example.org" }],
        userDetails: [
          { id: "anna@example.org", firstName: "Anna", lastName: "Admin" },
        ],
      })
    ).toEqual([
      {
        userId: "anna@example.org",
        firstName: "Anna",
        lastName: "Admin",
        name: "Anna Admin",
        label: "Anna Admin",
      },
    ]);
  });

  it("falls back to the name on the membership itself", () => {
    const [option] = tenantUserOptions({
      users: [{ userId: "b@example.org", firstName: "Bernd" }],
      userDetails: [],
    });

    expect(option.name).toBe("Bernd");
    expect(option.label).toBe("Bernd");
  });

  it("labels a member without any name by its id", () => {
    const [option] = tenantUserOptions({
      users: [{ userId: "c@example.org" }],
      userDetails: [],
    });

    expect(option.name).toBe("");
    expect(option.label).toBe("c@example.org");
  });

  it("drops entries without a user id", () => {
    expect(
      tenantUserOptions({ users: [{ userId: "" }, {}], userDetails: [] })
    ).toEqual([]);
  });

  it("reads an empty or absent response as no members", () => {
    expect(tenantUserOptions(undefined)).toEqual([]);
    expect(tenantUserOptions({})).toEqual([]);
  });
});
