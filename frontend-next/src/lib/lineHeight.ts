import { Extension } from "@tiptap/core";

export const LineHeight = Extension.create({
  name: "lineHeight",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => {
              const lineHeight = element.style.lineHeight;
              return lineHeight || null;
            },
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) {
                return {};
              }
              return {
                style: `line-height: ${attributes.lineHeight}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineHeight:
        (lineHeight: string) =>
        ({ chain, state, tr }) => {
          const { selection } = state;
          const { $from } = selection;
          
          // Get the current node (paragraph or heading)
          const node = $from.parent;
          if (node.type.name === "paragraph" || node.type.name === "heading") {
            tr.setNodeMarkup($from.before($from.depth), null, {
              ...node.attrs,
              lineHeight: lineHeight,
            });
            return true;
          }
          
          return chain()
            .updateAttributes("paragraph", { lineHeight })
            .updateAttributes("heading", { lineHeight })
            .run();
        },
      unsetLineHeight:
        () =>
        ({ chain, state, tr }) => {
          const { selection } = state;
          const { $from } = selection;
          
          const node = $from.parent;
          if (node.type.name === "paragraph" || node.type.name === "heading") {
            tr.setNodeMarkup($from.before($from.depth), null, {
              ...node.attrs,
              lineHeight: null,
            });
            return true;
          }
          
          return chain()
            .updateAttributes("paragraph", { lineHeight: null })
            .updateAttributes("heading", { lineHeight: null })
            .run();
        },
    };
  },
});

