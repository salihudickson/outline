import { CopyIcon, EditIcon, ExpandedIcon, ShrinkIcon, GrowIcon, TextWrapIcon } from "outline-icons";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import { NodeSelection } from "prosemirror-state";
import type { EditorState } from "prosemirror-state";
import {
  pluginKey as mermaidPluginKey,
  type MermaidState,
} from "@shared/editor/extensions/Mermaid";
import {
  getFrequentCodeLanguages,
  codeLanguages,
  getLabelForLanguage,
} from "@shared/editor/lib/code";
import { isCode, isMermaid } from "@shared/editor/lib/isCode";
import {
  codeCollapsePluginKey,
  MIN_LINES_FOR_TRUNCATION,
} from "@shared/editor/nodes/CodeFence";
import { findParentNode } from "@shared/editor/queries/findParentNode";
import type { MenuItem } from "@shared/editor/types";
import type { Dictionary } from "~/hooks/useDictionary";
import { metaDisplay } from "@shared/utils/keyboard";

export default function codeMenuItems(
  state: EditorState,
  readOnly: boolean | undefined,
  dictionary: Dictionary
): MenuItem[] {
  const node =
    state.selection instanceof NodeSelection
      ? state.selection.node
      : state.selection.$from.node();

  const frequentLanguages = getFrequentCodeLanguages();

  const frequentLangMenuItems = frequentLanguages.map((value) => {
    const label = codeLanguages[value]?.label;
    return langToMenuItem({ node, value, label });
  });

  const remainingLangMenuItems = Object.entries(codeLanguages)
    .filter(
      ([value]) =>
        !frequentLanguages.includes(value as keyof typeof codeLanguages)
    )
    .map(([value, item]) => langToMenuItem({ node, value, label: item.label }));

  const getLanguageMenuItems = () =>
    frequentLangMenuItems.length
      ? [
          ...frequentLangMenuItems,
          { name: "separator" },
          ...remainingLangMenuItems,
        ]
      : remainingLangMenuItems;

  const isEditingMermaid = !!(mermaidPluginKey.getState(state) as MermaidState)
    ?.editingId;

  const lineCount = (node.textContent.match(/\n/g) || []).length + 1;
  const isTall = !isMermaid(node) && lineCount >= MIN_LINES_FOR_TRUNCATION;

  // Determine whether the current code block is in the expanded set
  const expandedSet = codeCollapsePluginKey.getState(state);
  const codeBlockResult =
    state.selection instanceof NodeSelection && isCode(state.selection.node)
      ? { pos: state.selection.from }
      : findParentNode(isCode)(state.selection);
  const isExpanded =
    codeBlockResult !== undefined && !!expandedSet?.has(codeBlockResult.pos);

  return [
    {
      name: "copyToClipboard",
      icon: <CopyIcon />,
      label: readOnly
        ? getLabelForLanguage(node.attrs.language ?? "none")
        : undefined,
      tooltip: dictionary.copy,
    },
    {
      name: "separator",
    },
    {
      name: "edit_mermaid",
      icon: <EditIcon />,
      tooltip: dictionary.editDiagram,
      shortcut: `${metaDisplay} Enter`,
      visible: isMermaid(node) && !isEditingMermaid && !readOnly,
    },
    {
      name: "separator",
    },
    {
      name: "expandCodeBlock",
      icon: <GrowIcon />,
      tooltip: dictionary.expandCode,
      visible: isTall && !isExpanded && !readOnly,
    },
    {
      name: "collapseCodeBlock",
      icon: <ShrinkIcon />,
      tooltip: dictionary.collapseCode,
      visible: isTall && isExpanded && !readOnly,
    },
    {
      name: "separator",
    },
    {
      name: "toggleCodeBlockWrap",
      icon: <TextWrapIcon />,
      tooltip: dictionary.wrapText,
      active: () => node.attrs.wrap,
      visible: !readOnly && (!isMermaid(node) || isEditingMermaid),
    },
    {
      name: "separator",
    },
    {
      name: "code_block",
      label: getLabelForLanguage(node.attrs.language ?? "none"),
      icon: <ExpandedIcon />,
      children: getLanguageMenuItems(),
      visible: !readOnly,
    },
  ];
}

const langToMenuItem = ({
  node,
  value,
  label,
}: {
  node: ProseMirrorNode;
  value: string;
  label: string;
}): MenuItem => ({
  name: "code_block",
  label,
  active: () => node.attrs.language === value,
  attrs: {
    language: value,
  },
});
