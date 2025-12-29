import { Node } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";

export interface HorizontalRuleOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    horizontalRule: {
      setHorizontalRule: (options?: { width?: string; color?: string; thickness?: string; spacingBefore?: string | null; spacingAfter?: string | null }) => ReturnType;
      selectHorizontalRule: () => ReturnType;
      updateHorizontalRule: (options?: { width?: string; color?: string; thickness?: string; spacingBefore?: string | null; spacingAfter?: string | null }) => ReturnType;
    };
  }
}

export const CustomHorizontalRule = Node.create<HorizontalRuleOptions>({
  name: "horizontalRule",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  group: "block",

  parseHTML() {
    return [{ tag: "hr" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const attrs = node.attrs || {};
    const color = attrs.color || "#e5e7eb";
    const thickness = attrs.thickness || "2px";
    const width = attrs.width || "100%";
    const spacingBefore = attrs.spacingBefore || null;
    const spacingAfter = attrs.spacingAfter || null;
    
    
    const marginTop = spacingBefore || "1.5rem";
    const marginBottom = spacingAfter || "1.5rem";
    
    const styles = [
      "border: none",
      `border-top: ${thickness} solid ${color}`,
      `width: ${width}`,
      `margin-top: ${marginTop}`,
      `margin-bottom: ${marginBottom}`,
      "display: block"
    ].join("; ");
    
    return [
      "hr",
      {
        ...HTMLAttributes,
        style: styles,
        "data-color": color,
        "data-thickness": thickness,
        "data-width": width,
        ...(spacingBefore ? { "data-spacing-before": spacingBefore } : {}),
        ...(spacingAfter ? { "data-spacing-after": spacingAfter } : {}),
      },
    ];
  },

  addGlobalAttributes() {
    return [
      {
        types: ["horizontalRule"],
        attributes: {
          width: {
            default: "100%",
            parseHTML: (element) => element.getAttribute("data-width") || "100%",
            renderHTML: (attributes) => {
              if (!attributes.width) {
                return {};
              }
              return {
                "data-width": attributes.width,
              };
            },
          },
          color: {
            default: "#e5e7eb",
            parseHTML: (element) => element.getAttribute("data-color") || "#e5e7eb",
            renderHTML: (attributes) => {
              if (!attributes.color) {
                return {};
              }
              return {
                "data-color": attributes.color,
              };
            },
          },
          thickness: {
            default: "2px",
            parseHTML: (element) => element.getAttribute("data-thickness") || "2px",
            renderHTML: (attributes) => {
              if (!attributes.thickness) {
                return {};
              }
              return {
                "data-thickness": attributes.thickness,
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
              return {
                "data-spacing-before": attributes.spacingBefore,
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
              return {
                "data-spacing-after": attributes.spacingAfter,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setHorizontalRule:
        (options = {}) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: {
                width: options.width || "100%",
                color: options.color || "#e5e7eb",
                thickness: options.thickness || "2px",
                spacingBefore: options.spacingBefore || null,
                spacingAfter: options.spacingAfter || null,
              },
            })
            .run();
        },
      selectHorizontalRule:
        () =>
        ({ state, dispatch, tr }) => {
          const { selection } = state;
          const { $from } = selection;
          
          
          if (selection instanceof NodeSelection && selection.node.type.name === "horizontalRule") {
            return true;
          }
          
          
          if ($from.nodeBefore && $from.nodeBefore.type.name === "horizontalRule") {
            const pos = $from.pos - $from.nodeBefore.nodeSize;
            if (dispatch) {
              tr.setSelection(NodeSelection.create(state.doc, pos));
              dispatch(tr);
            }
            return true;
          }
          
          
          if ($from.nodeAfter && $from.nodeAfter.type.name === "horizontalRule") {
            const pos = $from.pos;
            if (dispatch) {
              tr.setSelection(NodeSelection.create(state.doc, pos));
              dispatch(tr);
            }
            return true;
          }
          
          
          let nearestPos = -1;
          let minDistance = Infinity;
          
          state.doc.descendants((node, pos) => {
            if (node.type.name === "horizontalRule") {
              const distance = Math.abs(pos - $from.pos);
              if (distance < minDistance) {
                minDistance = distance;
                nearestPos = pos;
              }
            }
          });
          
          if (nearestPos !== -1 && dispatch) {
            tr.setSelection(NodeSelection.create(state.doc, nearestPos));
            dispatch(tr);
            return true;
          }
          
          return false;
        },
      updateHorizontalRule:
        (options = {}) =>
        ({ state, dispatch, tr }) => {
          const { selection } = state;
          let hrPos = null;
          
          
          if (selection instanceof NodeSelection && selection.node.type.name === "horizontalRule") {
            hrPos = selection.$anchor.pos;
          } else {
            
            const { $from } = selection;
            
            if ($from.nodeBefore && $from.nodeBefore.type.name === "horizontalRule") {
              hrPos = $from.pos - $from.nodeBefore.nodeSize;
            } else if ($from.nodeAfter && $from.nodeAfter.type.name === "horizontalRule") {
              hrPos = $from.pos;
            } else {
              
              let nearestPos = -1;
              let minDistance = Infinity;
              
              state.doc.descendants((node, pos) => {
                if (node.type.name === "horizontalRule") {
                  const distance = Math.abs(pos - $from.pos);
                  if (distance < minDistance) {
                    minDistance = distance;
                    nearestPos = pos;
                  }
                }
              });
              
              if (nearestPos !== -1) {
                hrPos = nearestPos;
              }
            }
          }
          
          if (hrPos !== null) {
            const node = state.doc.nodeAt(hrPos);
            if (node && node.type.name === "horizontalRule") {
              if (dispatch) {
                tr.setNodeMarkup(hrPos, undefined, {
                  ...node.attrs,
                  ...options,
                });
                dispatch(tr);
              }
              return true;
            }
          }
          
          return false;
        },
    };
  },
});

