function sanitizeUserDiscounts(entries) {
  return (entries || [])
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => ({
      userId: entry.userId ?? "",
      discountPercent: Number.isInteger(entry.discountPercent)
        ? entry.discountPercent
        : 100,
    }));
}

function sanitizeRoleDiscounts(entries) {
  return (entries || [])
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => ({
      roleId: entry.roleId ?? null,
      discountPercent: Number.isInteger(entry.discountPercent)
        ? entry.discountPercent
        : 100,
    }));
}

export function normalizeBookingDiscounts(bookable) {
  if (!bookable || typeof bookable !== "object") {
    return bookable;
  }

  const usersFromLegacy = (bookable.freeBookingUsers || []).map((userId) => ({
    userId,
    discountPercent: 100,
  }));
  const rolesFromLegacy = (bookable.freeBookingRoles || []).map((roleId) => ({
    roleId,
    discountPercent: 100,
  }));

  if (!bookable.bookingDiscounts) {
    bookable.bookingDiscounts = {
      users: usersFromLegacy,
      roles: rolesFromLegacy,
    };
  } else {
    const discounts = bookable.bookingDiscounts;
    const users = sanitizeUserDiscounts(discounts.users);
    const roles = sanitizeRoleDiscounts(discounts.roles);

    discounts.users =
      users.length > 0 ? users : usersFromLegacy;
    discounts.roles =
      roles.length > 0 ? roles : rolesFromLegacy;
  }

  delete bookable.freeBookingUsers;
  delete bookable.freeBookingRoles;

  return bookable;
}

export function createEmptyBookingDiscounts() {
  return {
    users: [],
    roles: [],
  };
}
