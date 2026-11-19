import type { ReactNode } from "react";

/**
 * Renders the few markdown-style marks the model uses (**bold**, *italic*, _italic_, "- " and
 * "1. " lists, blank-line paragraphs) as React elements. Everything is rendered as text, never
 * as HTML, so model output cannot inject markup (docs/ai-assistant.md section 11).
 */

const INLINE = /(\*\*[^*\n]+\*\*|\*[^*\s][^*\n]*\*|_[^_\s][^_\n]*_)/g;

function inline(text: string, keyBase: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    const key = `${keyBase}-${i}`;
    if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (part.length > 2 && (part.startsWith("*") || part.startsWith("_")) && part.endsWith(part[0])) {
      return <em key={key}>{part.slice(1, -1)}</em>;
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
    // Headings are shown as plain text: the prompt forbids them, and a stray "#" is not worth a style.
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

export function AssistantText({ text, caret }: { text: string; caret?: ReactNode }) {
  const blocks = parse(text);
  if (!blocks.length) return <>{caret}</>;
  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, index) => {
        const tail = index === blocks.length - 1 ? caret : null;
        if (block.kind === "p") {
          return (
            <p key={index}>
              {inline(block.text, `p${index}`)}
              {tail}
            </p>
          );
        }
        const List = block.kind;
        return (
          <List key={index} className={block.kind === "ul" ? "list-disc pl-5" : "list-decimal pl-5"}>
            {block.items.map((item, i) => (
              <li key={i}>
                {inline(item, `l${index}-${i}`)}
                {i === block.items.length - 1 ? tail : null}
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
