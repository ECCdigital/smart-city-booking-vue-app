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
        }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const name = node.attrs.name || "";
    const open = node.attrs.triple ? "{{{" : "{{";
    const close = node.attrs.triple ? "}}}" : "}}";
    const attrs = {
      "data-variable": name,
      "data-triple": node.attrs.triple ? "true" : "false",
      class: "mail-variable-chip",
      contenteditable: "false",
    };
    if (node.attrs.label) {
      attrs["data-label"] = node.attrs.label;
    }
    return ["span", mergeAttributes(HTMLAttributes, attrs), `${open}${name}${close}`];
  },

  renderText({ node }) {
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
                },
              })
              .insertContent(" ")
              .run();
          },
    };
  },
});

export default VariableNode;
