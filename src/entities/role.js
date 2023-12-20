const RolePermission = Object.freeze({
  MANAGE_BOOKABLES: "manageBookables",
  MANAGE_USERS: "manageUsers",
  MANAGE_TENANTS: "manageTenants",
  MANAGE_ROLES: "manageRoles",
  MANAGE_BOOKINGS: "manageBookings",
  FREE_BOOKINGS: "freeBookings",
});

class Role {
  constructor(
    id,
    name,
    adminInterfaces,
    manageBookables,
    manageUsers,
    manageTenants,
    manageBookings,
    manageRoles,
    manageCoupons,
    freeBookings
  ) {
    this.id = id;
    this.name = name;
    this.adminInterfaces = adminInterfaces || [];
    this.manageBookables = manageBookables || {
      create: false,
      readAny: false,
      readOwn: false,
      updateAny: false,
      updateOwn: false,
      deleteOwn: false,
      deleteAny: false,
    };
    this.manageUsers = manageUsers || {
      create: false,
      readAny: false,
      readOwn: false,
      updateAny: false,
      updateOwn: false,
      deleteOwn: false,
      deleteAny: false,
    };
    this.manageTenants = manageTenants || {
      create: false,
      readAny: false,
      readOwn: false,
      updateAny: false,
      updateOwn: false,
      deleteOwn: false,
      deleteAny: false,
    };
    this.manageBookings = manageBookings || {
      create: false,
      readAny: false,
      readOwn: false,
      updateAny: false,
      updateOwn: false,
      deleteOwn: false,
      deleteAny: false,
    };
    this.manageRoles = manageRoles || {
      create: false,
      readAny: false,
      readOwn: false,
      updateAny: false,
      updateOwn: false,
      deleteOwn: false,
      deleteAny: false,
    };
    this.manageCoupons = manageCoupons || {
      create: false,
      readAny: false,
      readOwn: false,
      updateAny: false,
      updateOwn: false,
      deleteOwn: false,
      deleteAny: false,
    };
    this.freeBookings = freeBookings || false;
  }
}

export { Role, RolePermission };
