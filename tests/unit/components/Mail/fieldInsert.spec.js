import { describe, expect, it } from "vitest";
import Vue from "vue";
import {
  insertAtCursor,
  insertIntoField,
} from "@/components/Mail/fieldInsert.js";

describe("insertAtCursor", () => {
  it("inserts at the caret and places the caret behind the expression", () => {
    expect(insertAtCursor("ab", 1, 1, "{{x}}")).toEqual({
      value: "a{{x}}b",
      caret: 6,
    });
  });

  it("replaces a selection", () => {
    expect(insertAtCursor("hello world", 6, 11, "{{name}}")).toEqual({
      value: "hello {{name}}",
      caret: 14,
    });
  });

  it("appends when the caret position is unknown", () => {
    expect(insertAtCursor("ab", null, undefined, "{{x}}")).toEqual({
      value: "ab{{x}}",
      caret: 7,
    });
  });

  it("treats a missing value as empty", () => {
    expect(insertAtCursor(undefined, 0, 0, "{{x}}")).toEqual({
      value: "{{x}}",
      caret: 5,
    });
  });

  it("clamps positions outside the value", () => {
    expect(insertAtCursor("ab", 5, 9, "{{x}}")).toEqual({
      value: "ab{{x}}",
      caret: 7,
    });
  });
});

describe("insertIntoField", () => {
  it("reads the selection from the native input, applies the value and restores focus and caret", async () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.value = "hello world";
    input.setSelectionRange(6, 11);
    const applied = [];
    const fieldRef = { $refs: { input } };

    const result = insertIntoField(fieldRef, "{{name}}", (v) => {
      applied.push(v);
      input.value = v;
    });

    expect(result).toBe("hello {{name}}");
    expect(applied).toEqual(["hello {{name}}"]);
    await Vue.nextTick();
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(14);
    expect(input.selectionEnd).toBe(14);
    input.remove();
  });

  it("appends and still applies when there is no field element", () => {
    const applied = [];
    insertIntoField(null, "{{x}}", (v) => applied.push(v));
    expect(applied).toEqual(["{{x}}"]);
  });
});
