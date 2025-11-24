import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    paragraphSpacing: {
      /**
       * Set paragraph spacing (for backward compatibility)
       */
      setParagraphSpacing: (spacing: string) => ReturnType;
      /**
       * Set paragraph spacing before
       */
      setParagraphSpacingBefore: (spacing: string | null) => ReturnType;
      /**
       * Set paragraph spacing after
       */
      setParagraphSpacingAfter: (spacing: string | null) => ReturnType;
    };
  }
}

export const ParagraphSpacing = Extension.create({
  name: "paragraphSpacing",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph"],
        attributes: {
          spacing: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-spacing") || null,
            renderHTML: (attributes) => {
              
              if (!attributes.spacing || attributes.spacingAfter) {
                return attributes.spacing ? { "data-spacing": attributes.spacing } : {};
              }
              return {
                "data-spacing": attributes.spacing,
                style: `margin-bottom: ${attributes.spacing}`,
              };
            },
          },
          spacingBefore: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-spacing-before") || null,
            renderHTML: (attributes) => {
              if (!attributes.spacingBefore) {
                return {};
              }
              const styles: string[] = [];
              if (attributes.spacingBefore) {
                styles.push(`margin-top: ${attributes.spacingBefore}`);
              }
              return {
                "data-spacing-before": attributes.spacingBefore,
                style: styles.join("; "),
              };
            },
          },
          spacingAfter: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-spacing-after") || null,
            renderHTML: (attributes) => {
              if (!attributes.spacingAfter) {
                return {};
              }
              const styles: string[] = [];
              if (attributes.spacingAfter) {
                styles.push(`margin-bottom: ${attributes.spacingAfter}`);
              }
              return {
                "data-spacing-after": attributes.spacingAfter,
                style: styles.join("; "),
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setParagraphSpacing:
        (spacing: string) =>
        ({ chain, state, dispatch, tr }) => {
          const { selection } = state;
          const { $from } = selection;
          
          
          const paragraph = $from.parent;
          if (paragraph.type.name === "paragraph") {
            const pos = $from.before($from.depth);
            const newAttrs = {
              ...paragraph.attrs,
              spacing: spacing || null,
            };
            
            if (dispatch) {
              tr.setNodeMarkup(pos, null, newAttrs);
              dispatch(tr);
            }
            return true;
          }
          
          return chain()
            .updateAttributes("paragraph", { spacing: spacing || null })
            .run();
        },
      setParagraphSpacingBefore:
        (spacing: string | null) =>
        ({ chain, state, dispatch, tr }) => {
          const { selection } = state;
          const { $from } = selection;
          
          
          const paragraph = $from.parent;
          if (paragraph.type.name === "paragraph") {
            const pos = $from.before($from.depth);
            const newAttrs = {
              ...paragraph.attrs,
              spacingBefore: spacing,
            };
            
            if (dispatch) {
              tr.setNodeMarkup(pos, null, newAttrs);
              dispatch(tr);
            }
            return true;
          }
          
          return chain()
            .updateAttributes("paragraph", { spacingBefore: spacing })
            .run();
        },
      setParagraphSpacingAfter:
        (spacing: string | null) =>
        ({ chain, state, dispatch, tr }) => {
          const { selection } = state;
          const { $from } = selection;
          
          
          const paragraph = $from.parent;
          if (paragraph.type.name === "paragraph") {
            const pos = $from.before($from.depth);
            const newAttrs = {
              ...paragraph.attrs,
              spacingAfter: spacing,
            };
            
            if (dispatch) {
              tr.setNodeMarkup(pos, null, newAttrs);
              dispatch(tr);
            }
            return true;
          }
          
          return chain()
            .updateAttributes("paragraph", { spacingAfter: spacing })
            .run();
        },
    };
  },
});

