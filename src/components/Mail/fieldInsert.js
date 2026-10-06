// Inserting a picked variable expression into a plain text field: at the
// caret, replacing a selection, caret behind the expression, focus kept.
// The field stays a plain string and the source of truth; no chip, no
// recognition on reopen.

import Vue from "vue";

function clamp(position, length) {
  if (position == null) return length;
  const n = Number(position);
  if (!Number.isFinite(n)) return length;
  return Math.min(Math.max(n, 0), length);
}

/**
 * Pure part: new value and caret for inserting `expr` into `value` between
 * `selectionStart` and `selectionEnd`. Unknown positions append.
 */
export function insertAtCursor(value, selectionStart, selectionEnd, expr) {
  const text = value == null ? "" : String(value);
  const start = clamp(selectionStart, text.length);
  const end = Math.max(clamp(selectionEnd, text.length), start);
  return {
    value: text.slice(0, start) + expr + text.slice(end),
    caret: start + expr.length,
  };
}

/** The native input/textarea behind a Vuetify `v-text-field`/`v-textarea` ref. */
export function nativeInput(fieldRef) {
  const field = Array.isArray(fieldRef) ? fieldRef[0] : fieldRef;
  if (!field) return null;
  if (field.$refs && field.$refs.input) return field.$refs.input;
  return typeof field.value === "string" ? field : null;
}

/**
 * Inserts `expr` into the field behind `fieldRef`, hands the new value to
 * `apply` (the field's own update path) and, once Vue has re-rendered the
 * field, puts focus and caret behind the inserted expression.
 */
export function insertIntoField(fieldRef, expr, apply) {
  const el = nativeInput(fieldRef);
  const { value, caret } = insertAtCursor(
    el ? el.value : "",
    el ? el.selectionStart : null,
    el ? el.selectionEnd : null,
    expr
  );
  apply(value);
  if (el) {
    Vue.nextTick(() => {
      el.focus();
      if (typeof el.setSelectionRange === "function") {
        el.setSelectionRange(caret, caret);
      }
    });
  }
  return value;
}
