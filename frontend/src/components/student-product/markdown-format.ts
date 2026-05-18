export type AiMarkdownBlock =
  | {
      level: number;
      text: string;
      type: "heading";
    }
  | {
      text: string;
      type: "paragraph";
    }
  | {
      items: string[];
      ordered: boolean;
      start?: number;
      type: "list";
    };

export function normalizeAiMarkdownText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+(#{2,6}\s+)/g, "\n$1")
    .replace(/[ \t]+(\d+\.\s+)/g, "\n$1")
    .replace(/([：:。；;])([-*]\s+)/g, "$1\n$2")
    .replace(/[ \t]+([-*]\s+)/g, "\n$1")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

export function parseAiMarkdownBlocks(value: string): AiMarkdownBlock[] {
  const lines = normalizeAiMarkdownText(value).split("\n").filter(Boolean);
  const blocks: AiMarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      blocks.push({
        level: heading[1].length,
        text: trimHeadingText(heading[2]),
        type: "heading",
      });
      index += 1;
      continue;
    }

    const ordered = /^(\d+)\.\s+(.+)$/.exec(line);
    const unordered = /^[-*]\s+(.+)$/.exec(line);
    if (ordered || unordered) {
      const listItems: string[] = [];
      const isOrdered = Boolean(ordered);
      const start = ordered ? Number.parseInt(ordered[1], 10) : undefined;
      while (index < lines.length) {
        const candidate = lines[index] ?? "";
        const orderedItem = /^(\d+)\.\s+(.+)$/.exec(candidate);
        const unorderedItem = /^[-*]\s+(.+)$/.exec(candidate);
        if (isOrdered && orderedItem) {
          listItems.push(orderedItem[2].trim());
          index += 1;
          continue;
        }
        if (!isOrdered && unorderedItem) {
          listItems.push(unorderedItem[1].trim());
          index += 1;
          continue;
        }
        break;
      }
      blocks.push({
        items: listItems,
        ordered: isOrdered,
        ...(start && start > 1 ? { start } : {}),
        type: "list",
      });
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const candidate = lines[index] ?? "";
      if (/^(#{1,6})\s+/.test(candidate) || /^(\d+)\.\s+/.test(candidate) || /^[-*]\s+/.test(candidate)) {
        break;
      }
      paragraphLines.push(candidate);
      index += 1;
    }
    blocks.push({
      text: paragraphLines.join(" "),
      type: "paragraph",
    });
  }

  return blocks;
}

function trimHeadingText(value: string): string {
  return value.replace(/\s+#+$/g, "").trim();
}
