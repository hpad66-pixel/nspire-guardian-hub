/**
 * Local TipTap extensions for the correspondence / document editors — font
 * family, font size, line spacing, and sane Tab handling. Written in-repo (no
 * new npm dependency) and deliberately style-based (inline `style="…"`), so the
 * formatting survives straight into the branded letter HTML and the rasterized
 * PDF without needing a stylesheet nobody loads.
 */
import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontFamily: {
      setFontFamily: (font: string) => ReturnType;
      unsetFontFamily: () => ReturnType;
    };
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
    lineHeight: {
      setLineHeight: (height: string) => ReturnType;
      unsetLineHeight: () => ReturnType;
    };
  }
}

/** font-family as a TextStyle attribute (mirrors @tiptap/extension-font-family). */
export const FontFamily = Extension.create({
  name: "fontFamily",
  addOptions() {
    return { types: ["textStyle"] as string[] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontFamily: {
            default: null,
            parseHTML: (el: HTMLElement) => el.style.fontFamily?.replace(/["']/g, "") || null,
            renderHTML: (attrs: Record<string, any>) =>
              attrs.fontFamily ? { style: `font-family: ${attrs.fontFamily}` } : {},
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontFamily:
        (font: string) =>
        ({ chain }: any) =>
          chain().setMark("textStyle", { fontFamily: font }).run(),
      unsetFontFamily:
        () =>
        ({ chain }: any) =>
          chain().setMark("textStyle", { fontFamily: null }).removeEmptyTextStyle().run(),
    };
  },
});

/** font-size as a TextStyle attribute (values like "14px"). */
export const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] as string[] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el: HTMLElement) => el.style.fontSize || null,
            renderHTML: (attrs: Record<string, any>) =>
              attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }: any) =>
          chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }: any) =>
          chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

/**
 * line-height on block nodes — this is the "single / 1.5 / double space" control.
 * Applied to whichever of paragraph/heading the selection sits in.
 */
export const LineHeight = Extension.create({
  name: "lineHeight",
  addOptions() {
    return { types: ["paragraph", "heading"] as string[] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (el: HTMLElement) => el.style.lineHeight || null,
            renderHTML: (attrs: Record<string, any>) =>
              attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {},
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setLineHeight:
        (height: string) =>
        ({ chain }: any) =>
          this.options.types
            .reduce((c: any, type: string) => c.updateAttributes(type, { lineHeight: height }), chain())
            .run(),
      unsetLineHeight:
        () =>
        ({ chain }: any) =>
          this.options.types
            .reduce((c: any, type: string) => c.updateAttributes(type, { lineHeight: null }), chain())
            .run(),
    };
  },
});

/**
 * Tab handling. In a list, Tab/Shift-Tab demote/promote the item (the natural
 * expectation). Everywhere else, Tab inserts a real indent instead of yanking
 * focus out of the editor — four non-breaking spaces, which render identically
 * on screen, in the branded HTML, and in the rasterized PDF.
 */
export const TabHandler = Extension.create({
  name: "tabHandler",
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (this.editor.isActive("listItem")) {
          return this.editor.chain().focus().sinkListItem("listItem").run();
        }
        return this.editor.chain().focus().insertContent("    ").run();
      },
      "Shift-Tab": () => {
        if (this.editor.isActive("listItem")) {
          return this.editor.chain().focus().liftListItem("listItem").run();
        }
        // Swallow Shift-Tab so it doesn't blur the editor.
        return true;
      },
    };
  },
});
