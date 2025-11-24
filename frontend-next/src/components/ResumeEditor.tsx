"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { FontSize } from "@/lib/fontSize";
import { FontFamily } from "@/lib/fontFamily";
import { CustomHorizontalRule } from "@/lib/horizontalRule";
import { ParagraphSpacing } from "@/lib/paragraphSpacing";
import { LineHeight } from "@/lib/lineHeight";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Download,
  Upload,
  Save,
  Edit,
  Undo,
  Redo,
  Minus,
  Info
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ResumeEditorProps {
  content: string;
  onContentChange?: (content: string) => void;
  onImportHTML?: () => void;
  onSaveTemplate?: () => void;
}

export function ResumeEditor({ content, onContentChange, onImportHTML, onSaveTemplate }: ResumeEditorProps) {
  const [originalContent, setOriginalContent] = useState(content);
  const [isMounted, setIsMounted] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [, forceUpdate] = useState({});
  const isInternalUpdateRef = useRef(false);

  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        horizontalRule: false, 
      }),
      TextStyle,
      FontSize,
      FontFamily,
      Color,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      CustomHorizontalRule,
      ParagraphSpacing,
      LineHeight,
    ],
    content: content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      
      isInternalUpdateRef.current = true;
      onContentChange?.(html);
      
      setTimeout(() => {
        isInternalUpdateRef.current = false;
      }, 0);
    },
    onSelectionUpdate: () => {
      
      forceUpdate({});
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] p-4 dark:prose-invert max-w-5xl",
      },
      handleScrollToSelection: (view) => {
        
        
        return true;
      },
    },
  });




  
  useEffect(() => {
    if (editor && content !== originalContent && isMounted) {
      
      if (isInternalUpdateRef.current) {
        setOriginalContent(content);
        return;
      }
      
      
      const currentContent = editor.getHTML();
      
      
      if (currentContent !== content) {
        
        const { from, to } = editor.state.selection;
        const scrollContainer = document.querySelector('.ProseMirror')?.parentElement;
        const scrollTop = scrollContainer?.scrollTop || 0;
        
        setOriginalContent(content);
        editor.commands.setContent(content);
        
        
        setTimeout(() => {
          try {
            
            const docSize = editor.state.doc.content.size;
            const safeFrom = Math.min(from, docSize);
            const safeTo = Math.min(to, docSize);
            if (safeFrom > 0 && safeTo > 0) {
              editor.commands.setTextSelection({ from: safeFrom, to: safeTo });
            }
          } catch (e) {
            
            editor.commands.focus('end');
          }
          
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollTop;
          }
        }, 0);
      } else {
        
        setOriginalContent(content);
      }
    }
  }, [content, editor, originalContent, isMounted]);

  
  if (!isMounted || !editor) {
    return (
      <div className="w-full border rounded-lg overflow-hidden bg-white dark:bg-[#212121] min-h-[500px] flex items-center justify-center">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading editor...</p>
      </div>
    );
  }

  
  const createFullHTML = (html: string) => {
    const css = `
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          line-height: 1.6;
        }
        h1 { font-size: 24px; font-weight: bold; margin-top: 20px; margin-bottom: 10px; }
        h2 { font-size: 20px; font-weight: bold; margin-top: 18px; margin-bottom: 8px; }
        h3 { font-size: 18px; font-weight: bold; margin-top: 16px; margin-bottom: 6px; }
        p { margin-bottom: 10px; }
        ul, ol { margin-left: 20px; margin-bottom: 10px; }
        @media print {
          body {
            padding: 0;
            margin: 0;
          }
        }
      </style>
    `;
    return `<!DOCTYPE html><html><head><meta charset="UTF-8">${css}</head><body>${html}</body></html>`;
  };

  const downloadResume = () => {
    const html = editor.getHTML();
    const fullHtml = createFullHTML(html);
    
    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resume.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAsPDF = () => {
    const html = editor.getHTML();
    const fullHtml = createFullHTML(html);
    
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to print your resume.");
      return;
    }
    
    printWindow.document.write(fullHtml);
    printWindow.document.close();
    
    
    
    const triggerPrint = () => {
      setTimeout(() => {
        printWindow.print();
        
        
      }, 250);
    };
    
    if (printWindow.document.readyState === 'complete') {
      triggerPrint();
    } else {
      printWindow.onload = triggerPrint;
    }
  };

  return (
    <div className="w-full border rounded-lg overflow-hidden bg-white dark:bg-[#212121]">
      {/* Toolbar */}
      <div className="border-b p-2 flex flex-wrap items-center gap-2 bg-[#F9F9F9] dark:bg-[#303030]">
        {/* Undo/Redo */}
            <div className="flex gap-1 border-r pr-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                className="h-8"
              >
                <Undo className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                className="h-8"
              >
                <Redo className="h-4 w-4" />
              </Button>
            </div>

            {/* Text Formatting */}
            <div className="flex gap-1 border-r pr-2 items-center">
              <Button
                variant={editor.isActive("bold") ? "default" : "ghost"}
                size="sm"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className="h-8"
                title="Bold"
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                variant={editor.isActive("italic") ? "default" : "ghost"}
                size="sm"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className="h-8"
                title="Italic"
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                variant={editor.isActive("underline") ? "default" : "ghost"}
                size="sm"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className="h-8"
                title="Underline"
              >
                <UnderlineIcon className="h-4 w-4" />
              </Button>
            </div>

            {/* Headings */}
            <div className="flex gap-1 border-r pr-2 items-center">
              <Button
                variant={editor.isActive("heading", { level: 1 }) ? "default" : "ghost"}
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className="h-8"
                title="Heading 1"
              >
                <Heading1 className="h-4 w-4" />
              </Button>
              <Button
                variant={editor.isActive("heading", { level: 2 }) ? "default" : "ghost"}
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className="h-8"
                title="Heading 2"
              >
                <Heading2 className="h-4 w-4" />
              </Button>
              <Button
                variant={editor.isActive("heading", { level: 3 }) ? "default" : "ghost"}
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className="h-8"
                title="Heading 3"
              >
                <Heading3 className="h-4 w-4" />
              </Button>
            </div>

            {/* Lists */}
            <div className="flex gap-1 border-r pr-2 items-center">
              <Button
                variant={editor.isActive("bulletList") ? "default" : "ghost"}
                size="sm"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className="h-8"
                title="Bullet List"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={editor.isActive("orderedList") ? "default" : "ghost"}
                size="sm"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className="h-8"
                title="Numbered List"
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
            </div>

                        {/* Alignment */}
                        <div className="flex gap-1 border-r pr-2 items-center">
              <Button
                variant={editor.isActive({ textAlign: "left" }) ? "default" : "ghost"}
                size="sm"
                onClick={() => editor.chain().focus().setTextAlign("left").run()}
                className="h-8"
                title="Align Left"
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
              <Button
                variant={editor.isActive({ textAlign: "center" }) ? "default" : "ghost"}
                size="sm"
                onClick={() => editor.chain().focus().setTextAlign("center").run()}
                className="h-8"
                title="Align Center"
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
              <Button
                variant={editor.isActive({ textAlign: "right" }) ? "default" : "ghost"}
                size="sm"
                onClick={() => editor.chain().focus().setTextAlign("right").run()}
                className="h-8"
                title="Align Right"
              >
                <AlignRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Font Size */}
            <div className="flex gap-1 border-r pr-2 items-center">
              <select
                onChange={(e) => {
                  const size = e.target.value;
                  if (size === "default") {
                    editor.chain().focus().unsetFontSize().run();
                  } else {
                    editor.chain().focus().setFontSize(size).run();
                  }
                }}
                className="h-8 px-2 rounded-md border bg-background text-sm dark:bg-[#212121] dark:text-white dark:border-zinc-700"
                defaultValue="default"
                title="Font Size"
              >
                <option value="default">Font Size</option>
                <option value="8">8px</option>
                <option value="10">10px</option>
                <option value="12">12px</option>
                <option value="14">14px</option>
                <option value="16">16px</option>
                <option value="18">18px</option>
                <option value="20">20px</option>
                <option value="24">24px</option>
                <option value="28">28px</option>
                <option value="32">32px</option>
              </select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Info className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3 text-sm">
                  <p className="font-medium mb-1">Font Size</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Select the font size for your text. Choose from 12px to 32px.</p>
                </PopoverContent>
              </Popover>
            </div>

            {/* Font Family */}
            <div className="flex gap-1 border-r pr-2 items-center">
              <select
                value={(() => {
                  if (!editor) return "default";
                  const { state } = editor;
                  const { selection } = state;
                  const { $from } = selection;
                  const marks = $from.marks();
                  const fontFamilyMark = marks.find(mark => mark.type.name === "textStyle" && mark.attrs.fontFamily);
                  return fontFamilyMark?.attrs.fontFamily || "default";
                })()}
                onChange={(e) => {
                  const fontFamily = e.target.value;
                  if (fontFamily === "default") {
                    editor.chain().focus().unsetFontFamily().run();
                  } else {
                    editor.chain().focus().setFontFamily(fontFamily).run();
                  }
                }}
                className="h-8 px-2 rounded-md border bg-background text-sm dark:bg-[#212121] dark:text-white dark:border-zinc-700"
                title="Font Family"
              >
                <option value="default">Font Family</option>
                <option value="Arial, sans-serif">Arial</option>
                <option value="'Times New Roman', serif">Times New Roman</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="'Courier New', monospace">Courier New</option>
                <option value="Verdana, sans-serif">Verdana</option>
                <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                <option value="'Comic Sans MS', cursive">Comic Sans MS</option>
                <option value="Impact, sans-serif">Impact</option>
                <option value="'Lucida Console', monospace">Lucida Console</option>
                <option value="Tahoma, sans-serif">Tahoma</option>
                <option value="'Palatino Linotype', serif">Palatino</option>
                <option value="'Garamond', serif">Garamond</option>
                <option value="'Book Antiqua', serif">Book Antiqua</option>
                <option value="'Century Gothic', sans-serif">Century Gothic</option>
                <option value="'Calibri', sans-serif">Calibri</option>
                <option value="'Cambria', serif">Cambria</option>
                <option value="'Candara', sans-serif">Candara</option>
                <option value="'Consolas', monospace">Consolas</option>
                <option value="'Segoe UI', sans-serif">Segoe UI</option>
              </select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Info className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3 text-sm">
                  <p className="font-medium mb-1">Font Family</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Select the font family for your text. Choose from a variety of serif, sans-serif, and monospace fonts.</p>
                </PopoverContent>
              </Popover>
            </div>

            {/* Horizontal Rule */}
            <div className="flex gap-1 border-r pr-2 items-center">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().setHorizontalRule({ width: "100%", color: "#e5e7eb", thickness: "2px" }).run()}
                  className="h-8"
                  title="Insert Horizontal Line"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Info className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3 text-sm">
                    <p className="font-medium mb-1">Insert Horizontal Line</p>
                    <p className="text-zinc-600 dark:text-zinc-400">Click the dash icon to insert a horizontal line in your document.</p>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const selected = editor.chain().focus().selectHorizontalRule().run();
                    if (!selected) {
                      alert("No horizontal line found nearby. Please click on a line first.");
                    }
                  }}
                  className="h-8 px-2 text-xs"
                  title="Select Line"
                >
                  Select
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Info className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3 text-sm">
                    <p className="font-medium mb-1">Select Horizontal Line</p>
                    <p className="text-zinc-600 dark:text-zinc-400">Click to select the nearest horizontal line so you can customize its color and thickness.</p>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="color"
                  onChange={(e) => {
                    const updated = editor.chain().focus().updateHorizontalRule({ color: e.target.value }).run();
                    if (!updated) {
                      editor.chain().focus().selectHorizontalRule().updateHorizontalRule({ color: e.target.value }).run();
                    }
                  }}
                  className="h-8 w-8 cursor-pointer border rounded"
                  title="Line Color"
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Info className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3 text-sm">
                    <p className="font-medium mb-1">Line Color</p>
                    <p className="text-zinc-600 dark:text-zinc-400">Click to change the color of the selected horizontal line. If no line is selected, it will find and update the nearest one.</p>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-1">
                <select
                  onChange={(e) => {
                    const updated = editor.chain().focus().updateHorizontalRule({ thickness: e.target.value }).run();
                    if (!updated) {
                      editor.chain().focus().selectHorizontalRule().updateHorizontalRule({ thickness: e.target.value }).run();
                    }
                  }}
                  className="h-8 px-2 rounded-md border bg-background text-sm dark:bg-[#212121] dark:text-white dark:border-zinc-700"
                  defaultValue="2px"
                  title="Line Thickness"
                >
                  <option value="1px">Thin</option>
                  <option value="2px">Medium</option>
                  <option value="3px">Thick</option>
                  <option value="4px">Extra Thick</option>
                </select>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Info className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3 text-sm">
                    <p className="font-medium mb-1">Line Thickness</p>
                    <p className="text-zinc-600 dark:text-zinc-400">Choose the thickness of the selected horizontal line. Options range from Thin to Extra Thick.</p>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-1">
                <select
                  value={(() => {
                    if (!editor) return "default";
                    const { state } = editor;
                    const { selection } = state;
                    let hrNode = null;
                    
                    if (selection instanceof NodeSelection && selection.node.type.name === "horizontalRule") {
                      hrNode = selection.node;
                    } else {
                      const { $from } = selection;
                      if ($from.nodeBefore && $from.nodeBefore.type.name === "horizontalRule") {
                        hrNode = $from.nodeBefore;
                      } else if ($from.nodeAfter && $from.nodeAfter.type.name === "horizontalRule") {
                        hrNode = $from.nodeAfter;
                      }
                    }
                    
                    return hrNode?.attrs.spacingBefore || "default";
                  })()}
                  onChange={(e) => {
                    const spacingBefore = e.target.value === "default" ? null : e.target.value;
                    const updated = editor.chain().focus().updateHorizontalRule({ spacingBefore }).run();
                    if (!updated) {
                      editor.chain().focus().selectHorizontalRule().updateHorizontalRule({ spacingBefore }).run();
                    }
                  }}
                  className="h-8 px-2 rounded-md border bg-background text-sm dark:bg-[#212121] dark:text-white dark:border-zinc-700"
                  title="Spacing Before"
                >
                  <option value="default">Spacing Before</option>
                  <option value="0">0px</option>
                  <option value="0.5rem">0.5rem</option>
                  <option value="1rem">1rem</option>
                  <option value="1.5rem">1.5rem</option>
                  <option value="2rem">2rem</option>
                  <option value="2.5rem">2.5rem</option>
                  <option value="3rem">3rem</option>
                </select>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Info className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3 text-sm">
                    <p className="font-medium mb-1">Spacing Before</p>
                    <p className="text-zinc-600 dark:text-zinc-400">Control the space above the horizontal line. Higher values create more space before the line.</p>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-1">
                <select
                  value={(() => {
                    if (!editor) return "default";
                    const { state } = editor;
                    const { selection } = state;
                    let hrNode = null;
                    
                    if (selection instanceof NodeSelection && selection.node.type.name === "horizontalRule") {
                      hrNode = selection.node;
                    } else {
                      const { $from } = selection;
                      if ($from.nodeBefore && $from.nodeBefore.type.name === "horizontalRule") {
                        hrNode = $from.nodeBefore;
                      } else if ($from.nodeAfter && $from.nodeAfter.type.name === "horizontalRule") {
                        hrNode = $from.nodeAfter;
                      }
                    }
                    
                    return hrNode?.attrs.spacingAfter || "default";
                  })()}
                  onChange={(e) => {
                    const spacingAfter = e.target.value === "default" ? null : e.target.value;
                    const updated = editor.chain().focus().updateHorizontalRule({ spacingAfter }).run();
                    if (!updated) {
                      editor.chain().focus().selectHorizontalRule().updateHorizontalRule({ spacingAfter }).run();
                    }
                  }}
                  className="h-8 px-2 rounded-md border bg-background text-sm dark:bg-[#212121] dark:text-white dark:border-zinc-700"
                  title="Spacing After"
                >
                  <option value="default">Spacing After</option>
                  <option value="0">0px</option>
                  <option value="0.5rem">0.5rem</option>
                  <option value="1rem">1rem</option>
                  <option value="1.5rem">1.5rem</option>
                  <option value="2rem">2rem</option>
                  <option value="2.5rem">2.5rem</option>
                  <option value="3rem">3rem</option>
                </select>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Info className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3 text-sm">
                    <p className="font-medium mb-1">Spacing After</p>
                    <p className="text-zinc-600 dark:text-zinc-400">Control the space below the horizontal line. Higher values create more space after the line.</p>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Font Color */}
            <div className="flex gap-1 border-r pr-2 items-center">
              <input
                type="color"
                onChange={(e) => {
                  editor.chain().focus().setColor(e.target.value).run();
                }}
                className="h-8 w-8 cursor-pointer border rounded"
                title="Text Color"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Info className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3 text-sm">
                  <p className="font-medium mb-1">Text Color</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Click to change the color of the selected text or text you're about to type.</p>
                </PopoverContent>
              </Popover>
            </div>

            {/* Line Height */}
            <div className="flex gap-1 border-r pr-2 items-center">
              <select
                onChange={(e) => {
                  const lineHeight = e.target.value;
                  if (lineHeight === "default") {
                    editor.chain().focus().unsetLineHeight().run();
                  } else {
                    editor.chain().focus().setLineHeight(lineHeight).run();
                  }
                }}
                className="h-8 px-2 rounded-md border bg-background text-sm dark:bg-[#212121] dark:text-white dark:border-zinc-700"
                title="Line Height"
                defaultValue="default"
              >
                <option value="default">Line Height</option>
                <option value="1">1.0</option>
                <option value="1.2">1.2</option>
                <option value="1.5">1.5</option>
                <option value="1.8">1.8</option>
                <option value="2">2.0</option>
                <option value="2.5">2.5</option>
              </select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Info className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3 text-sm">
                  <p className="font-medium mb-1">Line Height</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Adjust the spacing between lines in a paragraph. Higher values create more space between lines.</p>
                </PopoverContent>
              </Popover>
            </div>

            {/* Paragraph Spacing Before */}
            <div className="flex gap-1 border-r pr-2 items-center">
              <select
                value={(() => {
                  if (!editor) return "default";
                  const { state } = editor;
                  const { selection } = state;
                  const { $from } = selection;
                  const paragraph = $from.parent;
                  if (paragraph.type.name === "paragraph" && paragraph.attrs.spacingBefore) {
                    return paragraph.attrs.spacingBefore;
                  }
                  return "default";
                })()}
                onChange={(e) => {
                  const spacingBefore = e.target.value === "default" ? null : e.target.value;
                  editor.chain().focus().setParagraphSpacingBefore(spacingBefore).run();
                }}
                className="h-8 px-2 rounded-md border bg-background text-sm dark:bg-[#212121] dark:text-white dark:border-zinc-700"
                title="Paragraph Spacing Before"
              >
                <option value="default">Spacing Before</option>
                <option value="0">0px</option>
                <option value="0.5rem">0.5rem</option>
                <option value="1rem">1rem</option>
                <option value="1.5rem">1.5rem</option>
                <option value="2rem">2rem</option>
                <option value="2.5rem">2.5rem</option>
                <option value="3rem">3rem</option>
              </select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Info className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3 text-sm">
                  <p className="font-medium mb-1">Paragraph Spacing Before</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Control the space above the paragraph. Higher values create more space before the paragraph.</p>
                </PopoverContent>
              </Popover>
            </div>

            {/* Paragraph Spacing After */}
            <div className="flex gap-1 items-center">
              <select
                value={(() => {
                  if (!editor) return "default";
                  const { state } = editor;
                  const { selection } = state;
                  const { $from } = selection;
                  const paragraph = $from.parent;
                  if (paragraph.type.name === "paragraph" && paragraph.attrs.spacingAfter) {
                    return paragraph.attrs.spacingAfter;
                  }
                  
                  if (paragraph.type.name === "paragraph" && paragraph.attrs.spacing) {
                    return paragraph.attrs.spacing;
                  }
                  return "default";
                })()}
                onChange={(e) => {
                  const spacingAfter = e.target.value === "default" ? null : e.target.value;
                  editor.chain().focus().setParagraphSpacingAfter(spacingAfter).run();
                }}
                className="h-8 px-2 rounded-md border bg-background text-sm dark:bg-[#212121] dark:text-white dark:border-zinc-700"
                title="Paragraph Spacing After"
              >
                <option value="default">Spacing After</option>
                <option value="0">0px</option>
                <option value="0.5rem">0.5rem</option>
                <option value="1rem">1rem</option>
                <option value="1.5rem">1.5rem</option>
                <option value="2rem">2rem</option>
                <option value="2.5rem">2.5rem</option>
                <option value="3rem">3rem</option>
              </select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Info className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3 text-sm">
                  <p className="font-medium mb-1">Paragraph Spacing After</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Control the space below the paragraph. Higher values create more space after the paragraph.</p>
                </PopoverContent>
              </Popover>
            </div>

        {/* Download & Import */}
        <div className="ml-auto flex gap-2">
          {onImportHTML && (
            <Button
              variant="outline"
              size="sm"
              onClick={onImportHTML}
              className="h-8"
            >
              <Upload className="h-4 w-4 mr-1" />
              Import HTML
            </Button>
          )}
          {onSaveTemplate && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSaveTemplate}
              className="h-8"
            >
              <Save className="h-4 w-4 mr-1" />
              Save Template
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={downloadResume}
            className="h-8"
          >
            <Download className="h-4 w-4 mr-1" />
            Download HTML
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadAsPDF}
            className="h-8"
          >
            <Download className="h-4 w-4 mr-1" />
            Print/PDF
          </Button>
        </div>
      </div>

      {/* Editor Content */}
      <div 
        ref={scrollContainerRef}
        id="editor-scroll-container"
        className={cn(
          "min-h-[500px] max-h-[800px] overflow-y-auto bg-white dark:bg-[#212121]"
        )}
      >
        <div className="p-6">
          <EditorContent editor={editor} />
        </div>
      </div>

    </div>
  );
}

