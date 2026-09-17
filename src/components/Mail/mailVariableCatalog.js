// Pure helpers over the backend's variable catalog
// (`templateVariables` of GET /api/tenants/:tenant/mail/templates/default).
// The catalog is the only source of variables; nothing here guesses at names.

import { AFTER_SNIPPET_SUFFIX } from "./snippetCatalog.js";

const ALL_KINDS = ["text", "number", "flag", "url", "html"];

/** Which variable kinds a field of the given kind offers. */
export const FIELD_KINDS = {
  url: ["url", "text", "number"],
  line: ["text", "number", "url"],
  text: ALL_KINDS,
  html: ALL_KINDS,
  subject: ["text", "number"],
};

/**
 * A catalog is loadable only when it is a non-empty list whose entries all
 * carry `kind`; the old `{ name, description }` shape is not mapped.
 */
export function isCatalogLoadable(catalog) {
  return (
    Array.isArray(catalog) &&
    catalog.length > 0 &&
    catalog.every((entry) => !!(entry && entry.kind))
  );
}

/** Entries valid in the given snippet; an `__after` key counts as its base key. */
export function filterVariablesForSnippet(variables, snippetKey) {
  const baseKey = String(snippetKey || "").endsWith(AFTER_SNIPPET_SUFFIX)
    ? snippetKey.slice(0, -AFTER_SNIPPET_SUFFIX.length)
    : snippetKey;
  return (variables || []).filter(
    (v) => !Array.isArray(v.snippets) || v.snippets.includes(baseKey)
  );
}

/** Whether any entry carries `sampleAggregated` (`""` is a valid sample). */
export function hasAggregatedSample(variables) {
  return (variables || []).some((v) => v.sampleAggregated !== undefined);
}

/**
 * Sample values for the preview: `sampleAggregated` where present when an
 * aggregated notice is previewed, else `sample`; entries without one are left out.
 */
export function sampleValuesFor(variables, aggregated) {
  const values = {};
  (variables || []).forEach((v) => {
    const value =
      aggregated && v.sampleAggregated !== undefined
        ? v.sampleAggregated
        : v.sample;
    if (value !== undefined) values[v.name] = value;
  });
  return values;
}

/** Entries whose `kind` a field of the given kind offers, in catalog order. */
export function filterVariablesForField(variables, field) {
  const kinds = FIELD_KINDS[field] || [];
  return (variables || []).filter((v) => kinds.includes(v.kind));
}

/** Single-line fields never take triple braces or `urlEncode`. */
function isSingleLineExpression(expr) {
  return !!expr && !expr.startsWith("{{{") && !/\burlEncode\b/.test(expr);
}

/** The Handlebars expression the picker inserts for a variable in a field. */
export function expressionForField(variable, field) {
  const name = variable.name;
  const plain = `{{${name}}}`;
  switch (field) {
  case "url":
    return variable.kind === "url" ? plain : `{{urlEncode ${name}}}`;
  case "line":
  case "subject":
    return isSingleLineExpression(variable.expr) ? variable.expr : plain;
  default:
    return variable.expr || plain;
  }
}

/**
 * What a conditional variable (`requires`) needs, judged against the tenant as
 * edited right now. `null` without `requires`; otherwise `level` "warning"
 * (the tenant flag is off, or there is no flag to check) or "info" (the flag
 * is on). `lead` is the part of `text` a renderer may set in bold: the
 * setting's label when the sentence names it, else empty.
 */
export function requirementFor(variable, tenant) {
  const requires = variable && variable.requires;
  if (!requires) return null;
  const setting = requires.tenantSetting;
  if (setting && (tenant || {})[setting.key]) {
    return {
      level: "info",
      icon: "mdi-information-outline",
      lead: "",
      text: requires.text,
    };
  }
  const lead = setting ? setting.label : "";
  const text = setting
    ? `${lead} ist in den Mandanten-Einstellungen deaktiviert – ${variable.label} bleibt leer.`
    : requires.text;
  return { level: "warning", icon: "mdi-alert-outline", lead, text };
}

/** Warning-level entries of the catalog, as `{ variable, text }`. */
export function warningVariables(variables, tenant) {
  return (variables || []).reduce((list, variable) => {
    const requirement = requirementFor(variable, tenant);
    if (requirement && requirement.level === "warning") {
      list.push({ variable, text: requirement.text });
    }
    return list;
  }, []);
}

/**
 * Warning-level variables a field value refers to inside any `{{ … }}`
 * (the name as a whole word, so `{{#if x}}` counts and `{{xY}}` does not).
 */
export function warningsInValue(value, variables, tenant) {
  const text = String(value || "");
  if (!text.includes("{{")) return [];
  return warningVariables(variables, tenant).filter(({ variable }) =>
    new RegExp(`\\{\\{[^}]*\\b${variable.name}\\b[^}]*\\}\\}`).test(text)
  );
}
