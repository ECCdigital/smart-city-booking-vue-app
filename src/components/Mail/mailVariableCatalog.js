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
