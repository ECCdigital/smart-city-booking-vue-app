class Booking {

  constructor(id, tenant, bookableId, assignedUserId, mail, comment, timeBegin, timeEnd, timeCreated) {
    this.id = id;
    this.tenant = tenant;
    this.bookableId = bookableId;
    this.assignedUserId = assignedUserId;
    this.mail = mail;
    this.comment = comment;
    this.timeBegin = timeBegin;
    this.timeEnd = timeEnd;
    this.timeCreated = timeCreated
    this.isCommitted = false;
  }
}

export { Booking };
