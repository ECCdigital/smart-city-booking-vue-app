/**
 * Feedback loop: after save, hasUnsavedChanges must be false.
 *
 * Mirrors BookableEdit.createOrUpdate + hasUnsavedChanges snapshot logic.
 * Exit 1 = bug present (RED). Exit 0 = clean after save (GREEN).
 *
 * Usage: node scripts/debug/bookable-unsaved-after-save.mjs
 */
import _ from "lodash";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const { normalizeLeadTimeFields } = await import(
  pathToFileURL(path.join(root, "src/utils/bookingLeadTime.js")).href
);
const { normalizeBookingDiscounts } = await import(
  pathToFileURL(path.join(root, "src/utils/bookingDiscounts.js")).href
);

function sampleApiBookable(overrides = {}) {
  return {
    id: "b1",
    tenantId: "t1",
    title: "Test Room",
    type: "room",
    isScheduleRelated: true,
    isTimePeriodRelated: false,
    isBlockPeriodRelated: false,
    freeBookingUsers: ["u1"],
    freeBookingRoles: ["r1"],
    customFields: [{ id: "cf1" }],
    ...overrides,
  };
}

function hasUnsavedChanges(bookable, originalSnapshot, isLoading = false) {
  if (isLoading || !originalSnapshot || typeof originalSnapshot !== "string") {
    return false;
  }
  const bookableClean = _.omit(bookable, ["customFields"]);
  return (
    JSON.stringify({
      bookable: bookableClean,
    }) !== originalSnapshot
  );
}

/** Current createOrUpdate: snapshot from normalized bookable (same as init) */
function applySave(responseData) {
  const bookable = normalizeBookingDiscounts(
    normalizeLeadTimeFields(_.cloneDeep(responseData))
  );
  const bookableClean = _.omit(bookable, ["customFields"]);
  const originalSnapshot = JSON.stringify({
    bookable: bookableClean,
  });
  return { bookable, originalSnapshot };
}

/** Legacy buggy path — kept to prove the harness still catches the regression */
function applySaveBuggy(responseData) {
  const bookable = normalizeBookingDiscounts(
    normalizeLeadTimeFields(_.cloneDeep(responseData))
  );
  const bookableClean = _.omit(responseData, ["customFields"]);
  const originalSnapshot = JSON.stringify({
    bookable: bookableClean,
  });
  return { bookable, originalSnapshot };
}

const apiData = sampleApiBookable();

{
  const { bookable, originalSnapshot } = applySaveBuggy(apiData);
  if (!hasUnsavedChanges(bookable, originalSnapshot)) {
    console.error(
      "Harness self-check failed: buggy path should stay dirty after save"
    );
    process.exit(2);
  }
}

{
  const { bookable, originalSnapshot } = applySave(apiData);
  const dirty = hasUnsavedChanges(bookable, originalSnapshot);
  console.log("after save hasUnsavedChanges:", dirty);
  if (dirty) {
    console.error("RED — unsaved-changes chip would stay visible after save");
    process.exit(1);
  }
  console.log("GREEN — unsaved-changes cleared after save");
  process.exit(0);
}
