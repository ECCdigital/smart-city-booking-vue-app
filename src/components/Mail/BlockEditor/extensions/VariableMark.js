import { Node, mergeAttributes } from "@tiptap/core";

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

  addCommands() {
    return {
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
