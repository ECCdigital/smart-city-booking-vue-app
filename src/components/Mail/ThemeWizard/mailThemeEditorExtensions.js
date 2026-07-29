import { Extension } from "@tiptap/core";
import Paragraph from "@tiptap/extension-paragraph";
import Image from "@tiptap/extension-image";

/**
 * Font size via TextStyle mark (inline style for email HTML).
 */
export const FontSize = Extension.create({
  name: "fontSize",

  addOptions() {
    return {
      types: ["textStyle"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => {
              const size = element.style?.fontSize;
              return size ? size.replace(/['"]+/g, "") : null;
            },
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    const setFontSize = (fontSize) => ({ chain }) => {
      if (!fontSize) {
        return chain()
          .setMark("textStyle", { fontSize: null })
          .removeEmptyTextStyle()
          .run();
      }
      return chain().setMark("textStyle", { fontSize }).run();
    };
    const unsetFontSize = () => ({ chain }) => {
      return chain()
        .setMark("textStyle", { fontSize: null })
        .removeEmptyTextStyle()
        .run();
    };
    return { setFontSize, unsetFontSize };
  },
});

/**
 * Line height on paragraphs (block style for email HTML).
 */
export const ParagraphWithLineHeight = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      lineHeight: {
        default: null,
        parseHTML: (element) => element.style?.lineHeight || null,
        renderHTML: (attributes) => {
          if (!attributes.lineHeight) return {};
          return {
            style: `line-height: ${attributes.lineHeight}`,
          };
        },
      },
    };
  },
});

function normalizeImageWidth(value) {
  if (value == null || value === "") return null;
  const raw = String(value).trim().replace(/px$/i, "");
  if (!raw || Number.isNaN(Number(raw))) return null;
  return String(Math.round(Number(raw)));
}

const EMAIL_IMAGE_BASE_STYLE =
  "display:block;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;color:#555555;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:18px;background-color:#eeeeee;";

/**
 * Image with width + alt text optimized for email clients that block remote images.
 * Alt text is shown by many clients when the image is not loaded.
 */
export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      alt: {
        default: "Bild",
        parseHTML: (element) => {
          const alt = element.getAttribute("alt");
          return alt && alt.trim() ? alt.trim() : "Bild";
        },
        renderHTML: (attributes) => {
          const alt =
            attributes.alt && String(attributes.alt).trim()
              ? String(attributes.alt).trim()
              : "Bild";
          return { alt };
        },
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute("title"),
        renderHTML: (attributes) => {
          const title =
            (attributes.title && String(attributes.title).trim()) ||
            (attributes.alt && String(attributes.alt).trim()) ||
            "Bild";
          return { title };
        },
      },
      width: {
        default: null,
        parseHTML: (element) => {
          const attr = element.getAttribute("width");
          if (attr) return normalizeImageWidth(attr);
          const styleWidth = element.style?.width;
          if (styleWidth) return normalizeImageWidth(styleWidth);
          return null;
        },
        renderHTML: (attributes) => {
          const width = normalizeImageWidth(attributes.width);
          if (!width) {
            return { style: EMAIL_IMAGE_BASE_STYLE };
          }
          return {
            width,
            style: `width:${width}px;${EMAIL_IMAGE_BASE_STYLE}`,
          };
        },
      },
    };
  },
});
