import { z } from 'zod';

/**
 * Command palette (`Ctrl/⌘+K`) for the back office (docs/design/04-ux.md 4.3).
 * One flat list of things the user can search: where to go, what to do, and which
 * page or post to open. Matching is a small fuzzy search that also works for Thai,
 * where there is no letter case to normalise.
 */

export const COMMAND_GROUPS = ['goto', 'action', 'content'] as const;
export type CommandGroup = (typeof COMMAND_GROUPS)[number];

export const COMMAND_GROUP_LABELS: Record<CommandGroup, string> = {
  goto: 'ไปที่',
  action: 'ทำอะไร',
  content: 'เนื้อหา',
};

export const commandItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  group: z.enum(COMMAND_GROUPS),
  /** Optional short line under the label, e.g. the page path. */
  hint: z.string().optional(),
  /** Extra words that should also match, e.g. English aliases. */
  keywords: z.array(z.string()).default([]),
});
export type CommandItem = z.infer<typeof commandItemSchema>;

const normalize = (value: string): string => value.trim().toLowerCase();

/**
 * Position of `query` inside `text` as a subsequence, or `null` when some
 * character is missing. Smaller (earlier, tighter) matches score higher.
 */
const subsequenceScore = (text: string, query: string): number | null => {
  let textIndex = 0;
  let firstMatch = -1;
  let lastMatch = -1;

  for (const character of query) {
    const found = text.indexOf(character, textIndex);
    if (found === -1) return null;
    if (firstMatch === -1) firstMatch = found;
    lastMatch = found;
    textIndex = found + 1;
  }

  return (lastMatch - firstMatch) + firstMatch;
};

/**
 * Score for one command against a query: `null` when it does not match, `0` when
 * the query is empty (everything matches). Direct substrings beat subsequences.
 */
export const matchCommand = (item: CommandItem, query: string): number | null => {
  const needle = normalize(query);
  if (needle.length === 0) return 0;

  const label = normalize(item.label);
  const haystacks = [label, ...item.keywords.map(normalize), normalize(item.hint ?? '')];

  const directIndex = label.indexOf(needle);
  if (directIndex !== -1) return directIndex;

  const keywordIndex = haystacks
    .slice(1)
    .map((value) => value.indexOf(needle))
    .filter((index) => index !== -1)
    .sort((a, b) => a - b)[0];
  if (keywordIndex !== undefined) return keywordIndex + 10;

  const fuzzy = subsequenceScore(label, needle);
  return fuzzy === null ? null : fuzzy + 100;
};

/**
 * Commands matching `query`, best first. With an empty query the list keeps its
 * given order, which is where "recent" and "suggested" items sit.
 */
export const filterCommands = (items: CommandItem[], query: string, limit = 8): CommandItem[] => {
  const scored = items
    .map((item, index) => ({ item, index, score: matchCommand(item, query) }))
    .filter((entry): entry is { item: CommandItem; index: number; score: number } => entry.score !== null)
    .sort((a, b) => a.score - b.score || a.index - b.index);

  return scored.slice(0, limit).map((entry) => entry.item);
};

export interface CommandGroupSection {
  group: CommandGroup;
  label: string;
  items: CommandItem[];
}

/**
 * Splits a flat command list into the labelled sections the palette renders.
 * The labels are Thai by default; a screen that runs in another language passes
 * its own map so the palette never mixes two languages
 * (AGENTS.md rule 4: every piece of UI text goes through i18n).
 */
export const groupCommands = (
  items: CommandItem[],
  labels: Record<CommandGroup, string> = COMMAND_GROUP_LABELS,
): CommandGroupSection[] =>
  COMMAND_GROUPS.map((group) => ({
    group,
    label: labels[group],
    items: items.filter((item) => item.group === group),
  })).filter((section) => section.items.length > 0);
