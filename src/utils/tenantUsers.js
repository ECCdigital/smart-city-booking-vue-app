/**
 * `GET /api/:tenant/users` returns the memberships (`users`) and the profiles
 * (`userDetails`) as two separate lists. Every screen that offers the members
 * of a tenant as a choice has to join them, so the join lives here rather than
 * once per screen.
 *
 * `name` is the profile name and is empty when the member has none; `label` is
 * what a picker shows, which falls back to the user id.
 *
 * @param {{users?: Array, userDetails?: Array}} response
 * @returns {Array<{userId: string, firstName: string, lastName: string, name: string, label: string}>}
 */
export function tenantUserOptions(response) {
  const userDetails = response?.userDetails || [];

  return (response?.users || [])
    .filter((user) => !!user?.userId)
    .map((user) => {
      const details = userDetails.find((detail) => detail.id === user.userId);
      const firstName = details?.firstName || user.firstName || "";
      const lastName = details?.lastName || user.lastName || "";
      const name = `${firstName} ${lastName}`.trim();

      return {
        userId: user.userId,
        firstName,
        lastName,
        name,
        label: name || user.userId,
      };
    });
}
