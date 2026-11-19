import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, font } from "@/theme/tokens";

/**
 * Renders the few markdown-style marks the model uses (**bold**, *italic*, _italic_, "- " and
 * "1. " lists, blank-line paragraphs) as Text. Everything is plain text, never markup
 * (docs/ai-assistant.md section 11). Same rules as the web AssistantText.
 */

const INLINE = /(\*\*[^*\n]+\*\*|\*[^*\s][^*\n]*\*|_[^_\s][^_\n]*_)/g;

function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) {
      return (
        <Text key={i} style={styles.bold}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    if (part.length > 2 && (part.startsWith("*") || part.startsWith("_")) && part.endsWith(part[0])) {
      return (
        <Text key={i} style={styles.italic}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    return part;
  });
}

type Block = { kind: "p"; text: string } | { kind: "ul" | "ol"; items: string[] };

function parse(text: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: "p", text: paragraph.join(" ") });
    paragraph = [];
  };
  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    const number = /^\d+[.)]\s+(.*)$/.exec(line);
    const item = bullet ?? number;
    if (item) {
      flush();
      const kind = bullet ? "ul" : "ol";
      const last = blocks[blocks.length - 1];
      if (last && last.kind === kind) last.items.push(item[1]);
      else blocks.push({ kind, items: [item[1]] });
    } else {
      paragraph.push(line.replace(/^#{1,6}\s+/, ""));
    }
  }
  flush();
  return blocks;
}

export function AssistantText({ text, caret, color = colors.ink }: { text: string; caret?: string | null; color?: string }) {
  const blocks = parse(text);
  if (!blocks.length) return caret ? <Text style={[styles.body, { color }]}>{caret}</Text> : null;
  return (
    <View style={styles.stack}>
      {blocks.map((block, index) => {
        const tail = index === blocks.length - 1 ? caret : null;
        if (block.kind === "p") {
          return (
            <Text key={index} style={[styles.body, { color }]}>
              {inline(block.text)}
              {tail}
            </Text>
          );
        }
        return (
          <View key={index} style={styles.list}>
            {block.items.map((item, i) => (
              <View key={i} style={styles.item}>
                <Text style={[styles.body, styles.marker, { color }]}>{block.kind === "ul" ? "•" : `${i + 1}.`}</Text>
                <Text style={[styles.body, styles.itemText, { color }]}>
                  {inline(item)}
                  {i === block.items.length - 1 ? tail : null}
                </Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 8 },
  body: { fontFamily: font.sans, fontSize: 14, lineHeight: 20 },
  bold: { fontFamily: font.medium },
  italic: { fontStyle: "italic" },
  list: { gap: 4 },
  item: { flexDirection: "row", gap: 8 },
  marker: { minWidth: 16 },
  itemText: { flex: 1 },
});
