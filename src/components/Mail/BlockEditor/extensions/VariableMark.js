import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const warningsKey = new PluginKey("mailVariableWarnings");

/**
 * Warning decorations over the chips of conditional variables. They live in
 * plugin state, not in the node, so the stored HTML never carries them and the
 * editor re-derives them whenever `setMailVariableWarnings` hands in a new
 * lookup (catalog or tenant changed).
 */
function warningDecorations(doc, warningFor) {
  const decorations = [];
  doc.descendants((node, pos) => {
    if (node.type.name !== "mailVariable") return;
    const text = warningFor(node.attrs.name);
    if (!text) return;
    decorations.push(
      Decoration.node(pos, pos + node.nodeSize, {
        class: "mail-variable-chip--warning",
        title: text,
      })
    );
  });
  return DecorationSet.create(doc, decorations);
}

const VariableNode = Node.create({
  name: "mailVariable",

  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      name: {
        default: "",
      },
      triple: {
        default: false,
      },
      label: {
        default: "",
      },
      // Vollständiger Handlebars-Ausdruck für komplexe Platzhalter
      // (Helper-Aufrufe, Partials, each/if-Blöcke). Hat Vorrang vor `name`.
      expr: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-variable]",
        getAttrs: (el) => ({
          name: el.getAttribute("data-variable") || "",
          triple: el.getAttribute("data-triple") === "true",
          label: el.getAttribute("data-label") || "",
          expr: el.getAttribute("data-expr") || "",
        }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const name = node.attrs.name || "";
    const expr = node.attrs.expr || "";
    const open = node.attrs.triple ? "{{{" : "{{";
    const close = node.attrs.triple ? "}}}" : "}}";
    const text = expr || `${open}${name}${close}`;
    const attrs = {
      "data-variable": name,
      "data-triple": node.attrs.triple ? "true" : "false",
      class: "mail-variable-chip",
      contenteditable: "false",
    };
    if (expr) {
      attrs["data-expr"] = expr;
    }
    if (node.attrs.label) {
      attrs["data-label"] = node.attrs.label;
    }
    return ["span", mergeAttributes(HTMLAttributes, attrs), text];
  },

  renderText({ node }) {
    if (node.attrs.expr) return node.attrs.expr;
    const name = node.attrs.name || "";
    return node.attrs.triple ? `{{{${name}}}}` : `{{${name}}}`;
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: warningsKey,
        state: {
          init: () => ({ warningFor: () => "" }),
          apply: (tr, previous) => {
            const warningFor = tr.getMeta(warningsKey);
            return warningFor ? { warningFor } : previous;
          },
        },
        props: {
          decorations(state) {
            return warningDecorations(state.doc, this.getState(state).warningFor);
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      /** `warningFor(name)` returns the warning text for a chip, or "" for none. */
      setMailVariableWarnings:
        (warningFor) =>
          ({ tr, dispatch }) => {
            if (dispatch) tr.setMeta(warningsKey, warningFor);
            return true;
          },
      insertMailVariable:
        (name, options = {}) =>
          ({ chain }) => {
            return chain()
              .focus()
              .insertContent({
                type: this.name,
                attrs: {
                  name,
                  triple: !!options.triple,
                  label: options.label || "",
                  expr: options.expr || "",
                },
              })
              .insertContent(" ")
              .run();
          },
    };
  },
});

export default VariableNode;
