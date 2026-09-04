const RolePermission = Object.freeze({
  MANAGE_BOOKABLES: "manageBookables",
  MANAGE_USERS: "manageUsers",
  MANAGE_ROLES: "manageRoles",
  MANAGE_BOOKINGS: "manageBookings",
  MANAGE_MEDIA: "manageMedia",
  FREE_BOOKINGS: "freeBookings",
});

// The admin interfaces a role can grant access to, as shown in the role
// editor. The backend keeps the matching enum in its role schema.
const adminInterfaceOptions = [
  { name: "Rollen", value: "roles" },
  { name: "Benutzer", value: "users" },
  { name: "Buchungen", value: "bookings" },
  { name: "Rabatte", value: "coupons" },
  { name: "Veranstaltungsräume", value: "locations" },
  { name: "Räume", value: "rooms" },
  { name: "Geräte & Weiteres", value: "resources" },
  { name: "Tickets", value: "tickets" },
  { name: "Veranstaltungen", value: "events" },
  { name: "Mediathek", value: "media" },
];

class Role {
  constructor(
    id,
    name,
    adminInterfaces,
    manageBookables,
    manageUsers,
    manageBookings,
    manageRoles,
    manageCoupons,
    freeBookings,
    manageMedia
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
    this.manageMedia = manageMedia || {
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

export { Role, RolePermission, adminInterfaceOptions };
