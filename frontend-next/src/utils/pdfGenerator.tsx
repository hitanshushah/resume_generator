import React from "react";
import { Document, Page, Text, View, StyleSheet, Link as PDFLink, pdf } from "@react-pdf/renderer";

// A4 size in points (1 inch = 72 points)
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const DEFAULT_MARGIN = 36; // 1 inch margins

function createStyles(margin: number) {
  return StyleSheet.create({
    page: {
      padding: margin,
      fontSize: 11,
      fontFamily: "Helvetica",
      lineHeight: 1.5,
    },
  h1: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 12,  
    marginBottom: 8,
  },
  h2: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 6,
  },
  h3: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 4,
  },
  p: {
    marginBottom: 8,
    textAlign: "left",
  },
  ul: {
    marginLeft: 20,
    marginBottom: 8,
  },
  ol: {
    marginLeft: 20,
    marginBottom: 8,
  },
  li: {
    marginBottom: 4,
  },
  strong: {
    fontWeight: "bold",
  },
  em: {
    fontStyle: "italic",
  },
  hr: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    marginTop: 12,
    marginBottom: 12,
  },
  link: {
    color: "#0066cc",
    textDecoration: "underline",
  },
  });
}

// Helper function to parse HTML and convert to react-pdf components
function parseHTMLToPDF(html: string, styles: any): React.ReactElement[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const body = doc.body;
  
  const elements: React.ReactElement[] = [];
  
  function processNode(node: Node, key: number = 0, isFirstElement: boolean = false): React.ReactElement | null {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        return <Text key={key}>{text}</Text>;
      }
      return null;
    }
    
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }
    
    const element = node as Element;
    const tagName = element.tagName.toLowerCase();
    const children: React.ReactElement[] = [];
    
    // Process child nodes
    Array.from(element.childNodes).forEach((child, index) => {
      const childElement = processNode(child, index);
      if (childElement) {
        children.push(childElement);
      }
    });
    
    // Get inline styles
    const inlineStyle = element.getAttribute("style") || "";
    const styleObj: any = {};
    
    // Parse inline styles
    if (inlineStyle) {
      inlineStyle.split(";").forEach((style) => {
        const [prop, value] = style.split(":").map((s) => s.trim());
        if (prop && value) {
          if (prop === "font-size") {
            styleObj.fontSize = parseInt(value);
          } else if (prop === "font-weight") {
            styleObj.fontWeight = value;
          } else if (prop === "font-style") {
            styleObj.fontStyle = value;
          } else if (prop === "color") {
            styleObj.color = value;
          } else if (prop === "text-align") {
            styleObj.textAlign = value;
          } else if (prop === "margin-top") {
            styleObj.marginTop = value;
          } else if (prop === "margin-bottom") {
            styleObj.marginBottom = value;
          }
        }
      });
    }
    
    // Remove top margin from first element to avoid extra space at the top of first page
    // Apply firstElementStyle last to ensure it overrides both tag styles and inline styles
    const firstElementStyle = isFirstElement && (tagName === "h1" || tagName === "h2" || tagName === "h3" || tagName === "p" || tagName === "ul" || tagName === "ol") 
      ? { marginTop: 0 } 
      : {};

    switch (tagName) {
      case "h1":
        return (
          <View key={key} style={[styles.h1, styleObj, firstElementStyle]} wrap={false} break={false}>
            {children.length > 0 ? children : <Text> </Text>}
          </View>
        );
      case "h2":
        return (
          <View key={key} style={[styles.h2, styleObj, firstElementStyle]} wrap={false} break={false}>
            {children.length > 0 ? children : <Text> </Text>}
          </View>
        );
      case "h3":
        return (
          <View key={key} style={[styles.h3, styleObj, firstElementStyle]} wrap={false} break={false}>
            {children.length > 0 ? children : <Text> </Text>}
          </View>
        );
      case "p":
        return (
          <View key={key} style={[styles.p, styleObj, firstElementStyle]} wrap={true} break={false}>
            {children.length > 0 ? children : <Text> </Text>}
          </View>
        );
      case "ul":
        return (
          <View key={key} style={[styles.ul, styleObj, firstElementStyle]}>
            {children}
          </View>
        );
      case "ol":
        return (
          <View key={key} style={[styles.ol, styleObj, firstElementStyle]}>
            {children}
          </View>
        );
      case "ul":
        return (
          <View key={key} style={[styles.ul, styleObj]}>
            {children}
          </View>
        );
      case "ol":
        return (
          <View key={key} style={[styles.ol, styleObj]}>
            {children}
          </View>
        );
      case "li":
        return (
          <View key={key} style={styles.li} wrap={true} break={false}>
            <Text>• {children.length > 0 ? children : <Text> </Text>}</Text>
          </View>
        );
      case "strong":
      case "b":
        return (
          <Text key={key} style={[styles.strong, styleObj]}>
            {children.length > 0 ? children : ""}
          </Text>
        );
      case "em":
      case "i":
        return (
          <Text key={key} style={[styles.em, styleObj]}>
            {children.length > 0 ? children : ""}
          </Text>
        );
      case "a":
        const href = element.getAttribute("href");
        return (
          <PDFLink key={key} src={href || "#"} style={styles.link}>
            {children.length > 0 ? children : href || ""}
          </PDFLink>
        );
      case "hr":
        return <View key={key} style={styles.hr} />;
      case "br":
        return <Text key={key}>{"\n"}</Text>;
      default:
        // For other tags, just render children
        if (children.length > 0) {
          return (
            <View key={key} style={styleObj} wrap={true} break={false}>
              {children}
            </View>
          );
        }
        return null;
    }
  }
  
  // Process all top-level nodes in body
  let isFirstElement = true;
  Array.from(body.childNodes).forEach((node, index) => {
    const element = processNode(node, index, isFirstElement);
    if (element) {
      elements.push(element);
      isFirstElement = false;
    }
  });
  
  return elements;
}

export function generatePDFDocument(html: string, margin: number = DEFAULT_MARGIN): React.ReactElement {
  const styles = createStyles(margin);
  const content = parseHTMLToPDF(html, styles);
  
  return (
    <Document>
      <Page
        size="A4"
        style={styles.page}
        wrap={true}
      >
        {content}
      </Page>
    </Document>
  );
}

export async function generatePDFBlob(html: string, margin: number = DEFAULT_MARGIN): Promise<Blob> {
  const doc = generatePDFDocument(html, margin);
  return await pdf(doc as React.ReactElement<React.ComponentProps<typeof Document>>).toBlob();
}

export async function downloadPDF(html: string, filename: string = "resume.pdf", margin: number = DEFAULT_MARGIN): Promise<void> {
  const blob = await generatePDFBlob(html, margin);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

