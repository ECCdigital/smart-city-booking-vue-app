// Presentation metadata for the local IQ activation states of the Salto KS
// remote-open wizard (backend spec docs/specs/salto-ks-remote-open.md §2/§3).
// An IQ without otp_enabled needs no activation and gets its own key; labels
// and hints live in i18n under accessPoint.tenant.salto.iq.state.<key>.

const META = {
  no_otp: { color: "blue-grey", icon: "mdi-lock-open-check", done: true },
  activated: { color: "success", icon: "mdi-check-circle", done: true },
  pending_pin: { color: "warning", icon: "mdi-email-alert", done: false },
  degraded: { color: "orange darken-3", icon: "mdi-alert", done: false },
  reactivation_required: {
    color: "error",
    icon: "mdi-restart-alert",
    done: false,
  },
  not_activated: { color: "grey", icon: "mdi-circle-outline", done: false },
};

// Open tasks first, sorted by how urgently the admin has to act.
const ACTION_ORDER = {
  pending_pin: 0,
  reactivation_required: 1,
  degraded: 2,
  not_activated: 3,
  activated: 4,
  no_otp: 5,
};

export function stateKey(iq) {
  if (!iq.otpEnabled) return "no_otp";
  return META[iq.state] ? iq.state : "not_activated";
}

export function stateMeta(iq) {
  const key = stateKey(iq);
  return { key, ...META[key] };
}

export function actionOrder(iq) {
  return ACTION_ORDER[stateKey(iq)];
}

export function iqDisplayName(iq) {
  return iq.customerReference || iq.id;
}

export function formatTimestamp(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString("de-DE", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch (e) {
    return "";
  }
}
