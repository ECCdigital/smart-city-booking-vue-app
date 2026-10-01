import { KEYCLOAK_VERSIONS } from "@/services/keycloak/realmGuide";

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
 */

const GUIDE = "instance.edit.sso.guide";
const TEXT = "instance.edit.sso.text";

/** Indents of what a step says and of the entries of a list. */
const STEP = "   ";
const LIST = "  ";

function header(guide, t, { instance }) {
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
 * A step in the order of the checklist: warnings first, then the roles, the
 * settings, the Adressen and the other notes.
 */
function stepLines(step, t) {
  const warnings = step.notes.filter((note) => note.type === "warning");
  const infos = step.notes.filter((note) => note.type !== "warning");
  return [
    `${step.number}. ${t(`${GUIDE}.steps.${step.key}.title`)}`,
    ...indent(
      [
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
 * @returns {string} the text, lines separated by `\n`
 *
 * „Anleitung mit Ergebnis kopieren“ (ECCdigital/tickets#97) hands the result
 * of „Realm prüfen“ on as a further option, `{ result }`: the time of the
 * check in the header, the state and reason of each result in its step.
 */
export function guideAsText(guide, t, options = {}) {
  const blocks = [
    header(guide, t, options),
    ...(guide.hints.length ? [hintLines(guide.hints, t)] : []),
    ...guide.steps.map((step) => stepLines(step, t)),
  ];
  return blocks.map((lines) => lines.join("\n")).join("\n\n");
}
