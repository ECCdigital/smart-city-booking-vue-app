/** The short description the storefront shows next to the tenant's name. */
export const TENANT_DESCRIPTION_MAX_LENGTH = 300;

/** The form rule for the short description; it is optional. */
export const tenantDescriptionRule = ($t) => (v) =>
  !v ||
  v.length <= TENANT_DESCRIPTION_MAX_LENGTH ||
  $t("tenant.description.too-long", { max: TENANT_DESCRIPTION_MAX_LENGTH });

class Tenant {
  constructor({
    id,
    name,
    description,
    contactName,
    location,
    mail,
    phone,
    website,
    bookableDetailLink,
    eventDetailLink,
    genericMailTemplate,
    noreplyMail,
    noreplyDisplayName,
    noreplyHost,
    noreplyPort,
    noreplyUser,
    noreplyPassword,
    noreplyStarttls,
    noreplyUseGraphApi,
    noreplyGraphTenantId,
    noreplyGraphClientId,
    noreplyGraphClientSecret,
    receiptTemplate,
    receiptNumberPrefix,
    receiptCount,
    invoiceTemplate,
    invoiceNumberPrefix,
    invoiceCount,
    paymentPurposeSuffix,
    applications,
    maxBookingAdvanceInMonths,
    cancellationRefundTiers,
    cancellationRefundPercentageWithoutTimeSpan,
    defaultEventCreationMode,
    enablePublicStatusView,
    ownerUserIds,
    users,
    mailSnippets,
    mailSubjects,
    mailShowSupportFooter,
    mailBookingPeriodFormat,
  }) {
    this.id = id;
    this.name = name;
    this.description = description || "";
    this.contactName = contactName;
    this.location = location;
    this.mail = mail;
    this.phone = phone;
    this.website = website;
    this.bookableDetailLink = bookableDetailLink;
    this.eventDetailLink = eventDetailLink;
    this.genericMailTemplate = genericMailTemplate;
    this.noreplyMail = noreplyMail;
    this.noreplyDisplayName = noreplyDisplayName;
    this.noreplyHost = noreplyHost;
    this.noreplyPort = noreplyPort;
    this.noreplyUser = noreplyUser;
    this.noreplyPassword = noreplyPassword;
    this.noreplyStarttls = noreplyStarttls;
    this.noreplyUseGraphApi = noreplyUseGraphApi || false;
    this.noreplyGraphTenantId = noreplyGraphTenantId;
    this.noreplyGraphClientId = noreplyGraphClientId;
    this.noreplyGraphClientSecret = noreplyGraphClientSecret;
    this.receiptTemplate = receiptTemplate;
    this.receiptNumberPrefix = receiptNumberPrefix;
    this.receiptCount = receiptCount;
    this.invoiceTemplate = invoiceTemplate;
    this.invoiceNumberPrefix = invoiceNumberPrefix;
    this.invoiceCount = invoiceCount;
    this.paymentPurposeSuffix = paymentPurposeSuffix;
    this.applications = applications || [];
    this.maxBookingAdvanceInMonths = maxBookingAdvanceInMonths;
    this.cancellationRefundTiers = cancellationRefundTiers || [];
    this.cancellationRefundPercentageWithoutTimeSpan =
      cancellationRefundPercentageWithoutTimeSpan ?? 100;
    this.defaultEventCreationMode = defaultEventCreationMode || "";
    this.enablePublicStatusView = enablePublicStatusView;
    this.ownerUserIds = ownerUserIds || [];
    this.users = users || [];
    this.mailSnippets = mailSnippets || {};
    this.mailSubjects = mailSubjects || {};
    this.mailShowSupportFooter =
      mailShowSupportFooter === undefined ? true : !!mailShowSupportFooter;
    this.mailBookingPeriodFormat = mailBookingPeriodFormat || "default";
  }
}

export default Tenant;
