import { KEYCLOAK_VERSIONS } from "@/services/keycloak/realmGuide";
import {
  checkMoment,
  hasParts,
  partLabel,
  reasonSentence,
  resultSteps,
  rowTitle,
  statusCounts,
  statusLabel,
} from "@/services/keycloak/realmCheck";

/**
 * The Anleitung as plain text, for the menu „Als Text“ of the tab
 * „Single Sign-On“: the instance's owner mails it to the customer's IT, who
 * set up the realm without access to the Admin UI.
 *
 * Built from the same `guide` as the checklist (`buildRealmGuide`) and with
 * the same translations (`instance.edit.sso.guide.*`), so text and checklist
 * never say different things. Only the frame of the text is its own, under
 * `instance.edit.sso.text.*`. Placeholders of missing values read as in the
 * checklist; the guide never carries the Client Secret, so the text cannot.
 * With the result of „Realm prüfen“ the text says per step what the check
 * found, in the sentences the checklist shows (`realmCheck`).
 */

const GUIDE = "instance.edit.sso.guide";
const TEXT = "instance.edit.sso.text";
const CHECK = "instance.edit.sso.check";

/** Indents of what a step says, of the entries of a list and of parts. */
const STEP = "   ";
const LIST = "  ";
const PART = "    ";

/** When the realm was checked and how many results came out per state. */
function checkedLine(result, steps, t) {
  const counts = statusCounts(steps)
    .map(({ status, count }) =>
      t(`${CHECK}.count`, { count, status: statusLabel(status) })
    )
    .join(", ");
  return t(`${TEXT}.checked`, {
    moment: checkMoment(result.checkedAt),
    counts,
  });
}

function header(guide, t, { instance, result }, steps) {
  const { serverUrl, realm, issuer } = guide.values;
  return [
    t(`${TEXT}.title`),
    ...(instance ? [`${t(`${TEXT}.instance`)}: ${instance}`] : []),
    `${t("instance.edit.sso.status.mode")}: ${t(
      `instance.edit.sso.status.modes.${guide.mode}`
    )}`,
    t(`${GUIDE}.notes.version`, { ...KEYCLOAK_VERSIONS }),
    "",
    `${t(`${TEXT}.serverUrl`)}: ${serverUrl.text}`,
    `${t(`${TEXT}.realm`)}: ${realm.text}`,
    `${t("instance.edit.sso.status.issuer")}: ${issuer.text}`,
    ...(result ? [checkedLine(result, steps, t)] : []),
  ];
}

/** A result: as a whole, or per part on lines of their own. */
function rowLines(row) {
  const head = `- ${rowTitle(row)}: ${statusLabel(row.status)}`;
  if (!hasParts(row)) return [`${head}. ${reasonSentence(row.id, row)}`];
  return [
    head,
    ...indent(
      row.parts.map(
        (part) =>
          `${partLabel(row.id, part)}: ${statusLabel(
            part.status
          )}. ${reasonSentence(row.id, part)}`
      ),
      PART
    ),
  ];
}

/** The step's state after the check and its results, or nothing. */
function resultLines(stepResult, t) {
  if (!stepResult) return [];
  return [
    t(`${TEXT}.result`, { status: statusLabel(stepResult.status) }),
    ...stepResult.rows.flatMap(rowLines),
  ];
}

/** The hints above the checklist, before the steps. */
function hintLines(hints, t) {
  return [
    t(`${TEXT}.hints`),
    ...hints.map((hint) => `- ${t(`${GUIDE}.hints.${hint.id}`, hint.params)}`),
  ];
}

function indent(lines, by) {
  return lines.map((line) => `${by}${line}`);
}

function noteText(note, t) {
  return t(`${GUIDE}.notes.${note.id}`, note.params);
}

/** Keycloak's own name, or a label of Biletado's. */
function settingName(setting, t) {
  return setting.name || t(`${GUIDE}.labels.${setting.label}`);
}

function settingLine(setting, t) {
  return `${settingName(setting, t)}: ${setting.value.text}`;
}

/** A Rücksprungadresse; the one for „Benutzer wechseln“ says so. */
function entryLine(value, t) {
  return value.switchUser
    ? `${value.text}  (${t(`${GUIDE}.switchUser`)})`
    : value.text;
}

/** Per Adresse the app, then per field of the Web-Client its entries. */
function addressLines(address, t) {
  return [
    `${t(`${GUIDE}.apps.${address.app}`)}: ${address.origin.text}`,
    ...indent(
      address.fields.flatMap((field) => [
        `${field.name}:`,
        ...indent(
          field.values.map((value) => entryLine(value, t)),
          LIST
        ),
      ]),
      LIST
    ),
  ];
}

function sectionLines(section, t) {
  return [
    ...section.addresses.flatMap((address) => addressLines(address, t)),
    ...(section.addresses.length ? [] : [t(`${GUIDE}.apps.${section.app}`)]),
    ...section.notes.map((note) => noteText(note, t)),
  ];
}

function roleLines(roles, t) {
  if (!roles || !roles.length) return [];
  return [
    `${t(`${GUIDE}.labels.keycloakRoles`)}:`,
    ...indent(
      roles.map((role) => role.text),
      LIST
    ),
  ];
}

/**
 * A step in the order of the checklist: the result of the check, warnings,
 * then the roles, the settings, the Adressen and the other notes.
 */
function stepLines(step, t, stepResult) {
  const warnings = step.notes.filter((note) => note.type === "warning");
  const infos = step.notes.filter((note) => note.type !== "warning");
  return [
    `${step.number}. ${t(`${GUIDE}.steps.${step.key}.title`)}`,
    ...indent(
      [
        ...resultLines(stepResult, t),
        ...warnings.map((note) =>
          t(`${TEXT}.warning`, { text: noteText(note, t) })
        ),
        ...roleLines(step.roles, t),
        ...step.settings.map((setting) => settingLine(setting, t)),
        ...(step.sections || []).flatMap((section) => sectionLines(section, t)),
        ...infos.map((note) => noteText(note, t)),
      ],
      STEP
    ),
  ];
}

/**
 * @param {object} guide the Anleitung, from `buildRealmGuide`
 * @param {(key: string, params?: object) => string} t translates, e.g. `$t`
 * @param {object} [options]
 * @param {string} [options.instance] names the instance in the header, e.g.
 *   the Adresse of the Admin UI the text was copied from
 * @param {object} [options.result] the result of „Realm prüfen“
 *   (`{ checkedAt, rows }`, see `checkResult`) for „Anleitung mit Ergebnis
 *   kopieren“: the time of the check and the counts in the header, the state
 *   and the reasons of its results in each step
 * @returns {string} the text, lines separated by `\n`
 */
export function guideAsText(guide, t, options = {}) {
  const steps = options.result ? resultSteps(options.result) : {};
  const blocks = [
    header(guide, t, options, steps),
    ...(guide.hints.length ? [hintLines(guide.hints, t)] : []),
    ...guide.steps.map((step) => stepLines(step, t, steps[step.key])),
  ];
  return blocks.map((lines) => lines.join("\n")).join("\n\n");
}
