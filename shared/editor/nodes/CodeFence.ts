import copy from "copy-to-clipboard";
import type { Token } from "markdown-it";
import { textblockTypeInputRule } from "prosemirror-inputrules";
import type {
  NodeSpec,
  NodeType,
  Schema,
  Node as ProsemirrorNode,
} from "prosemirror-model";
import type { Command, EditorState } from "prosemirror-state";
import {
  NodeSelection,
  Plugin,
  PluginKey,
  TextSelection,
} from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { toast } from "sonner";
import type { Primitive } from "utility-types";
import type { Dictionary } from "~/hooks/useDictionary";
import type { UserPreferences } from "../../types";
import { isMac } from "../../utils/browser";
import backspaceToParagraph from "../commands/backspaceToParagraph";
import {
  newlineInCode,
  indentInCode,
  moveToNextNewline,
  moveToPreviousNewline,
  outdentInCode,
  enterInCode,
  splitCodeBlockOnTripleBackticks,
} from "../commands/codeFence";
import { selectAll } from "../commands/selectAll";
import toggleBlockType from "../commands/toggleBlockType";
import { CodeHighlighting } from "../extensions/CodeHighlighting";
import Mermaid, {
  pluginKey as mermaidPluginKey,
  type MermaidState,
} from "../extensions/Mermaid";
import {
  getRecentlyUsedCodeLanguage,
  setRecentlyUsedCodeLanguage,
} from "../lib/code";
import { isCode, isMermaid } from "../lib/isCode";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";
import { findNextNewline, findPreviousNewline } from "../queries/findNewlines";
import { findParentNode } from "../queries/findParentNode";
import { getMarkRange } from "../queries/getMarkRange";
import { isInCode } from "../queries/isInCode";
import Node from "./Node";

const DEFAULT_LANGUAGE = "javascript";

/** Minimum line count for a code block to show expand/collapse controls. */
export const MIN_LINES_FOR_TRUNCATION = 20;

/**
 * Plugin key for tracking which code blocks are expanded.
 * Plugin state is a Set of document positions of explicitly expanded blocks.
 */
export const codeCollapsePluginKey = new PluginKey<Set<number>>("code-collapse");

/**
 * Returns the line count of the given code node, or undefined if the node is
 * not a collapsible block (Mermaid diagrams are excluded).
 *
 * @param node - ProseMirror node to inspect.
 * @returns number of lines in the code block, or undefined if not collapsible.
 */
function getCollapsibleLineCount(
  node: ProsemirrorNode
): number | undefined {
  if (!isCode(node) || isMermaid(node)) {
    return undefined;
  }
  return (node.textContent.match(/\n/g) || []).length + 1;
}

export default class CodeFence extends Node {
  constructor(options: {
    dictionary: Dictionary;
    userPreferences?: UserPreferences | null;
  }) {
    super(options);
  }

  get showLineNumbers(): boolean {
    return this.options.userPreferences?.codeBlockLineNumbers ?? true;
  }

  get name() {
    return "code_fence";
  }

  get schema(): NodeSpec {
    return {
      attrs: {
        language: {
          default: DEFAULT_LANGUAGE,
          validate: "string",
        },
        wrap: {
          default: false,
          validate: "boolean",
        },
      },
      content: "text*",
      marks: "comment",
      group: "block",
      code: true,
      defining: true,
      draggable: false,
      parseDOM: [
        {
          tag: ".code-block",
          preserveWhitespace: "full",
          contentElement: (node: HTMLElement) =>
            node.querySelector("code") || node,
          getAttrs: (dom: HTMLDivElement) => ({
            language: dom.dataset.language,
            wrap: dom.classList.contains("with-line-wrap"),
          }),
        },
        {
          tag: "code",
          preserveWhitespace: "full",
          getAttrs: (dom) => {
            // Only parse code blocks that contain newlines for code fences,
            // otherwise the code mark rule will be applied.
            if (!dom.textContent?.includes("\n")) {
              return false;
            }
            return { language: dom.dataset.language };
          },
        },
      ],
      toDOM: (node) => [
        "div",
        {
          class: `code-block ${
            node.attrs.wrap
              ? "with-line-wrap"
              : this.showLineNumbers
                ? "with-line-numbers"
                : ""
          }`,
          "data-language": node.attrs.language,
        },
        ["pre", ["code", { spellCheck: "false" }, 0]],
      ],
    };
  }

  commands({ type, schema }: { type: NodeType; schema: Schema }) {
    return {
      code_block: (attrs: Record<string, Primitive>) => {
        if (attrs?.language) {
          setRecentlyUsedCodeLanguage(attrs.language as string);
        }
        return toggleBlockType(type, schema.nodes.paragraph, {
          language: getRecentlyUsedCodeLanguage() ?? DEFAULT_LANGUAGE,
          ...attrs,
        });
      },
      toggleCodeBlockWrap: (): Command => (state, dispatch) => {
        const codeBlock = findParentNode(isCode)(state.selection);
        if (!codeBlock) {
          return false;
        }

        if (dispatch) {
          dispatch(
            state.tr.setNodeMarkup(codeBlock.pos, undefined, {
              ...codeBlock.node.attrs,
              wrap: !codeBlock.node.attrs.wrap,
            })
          );
        }
        return true;
      },
      edit_mermaid: (): Command => (state, dispatch) => {
        const codeBlock =
          state.selection instanceof NodeSelection &&
          isCode(state.selection.node)
            ? { pos: state.selection.from, node: state.selection.node }
            : findParentNode(isCode)(state.selection);
        if (!codeBlock || !isMermaid(codeBlock.node)) {
          return false;
        }

        const mermaidState = mermaidPluginKey.getState(state) as MermaidState;
        const decorations = mermaidState?.decorationSet.find(
          codeBlock.pos,
          codeBlock.pos + codeBlock.node.nodeSize
        );
        const nodeDecoration = decorations?.find(
          (d) => d.spec.diagramId && d.from === codeBlock.pos
        );
        const diagramId = nodeDecoration?.spec.diagramId;

        if (dispatch && diagramId) {
          dispatch(
            state.tr
              .setMeta(mermaidPluginKey, {
                editingId:
                  mermaidState?.editingId === diagramId ? undefined : diagramId,
              })
              .setSelection(TextSelection.create(state.doc, codeBlock.pos + 1))
              .scrollIntoView()
          );
        }
        return true;
      },
      copyToClipboard: (): Command => (state, dispatch) => {
        const codeBlock = findParentNode(isCode)(state.selection);

        if (codeBlock) {
          copy(codeBlock.node.textContent);
          toast.message(this.options.dictionary.codeCopied);
          return true;
        }

        const { doc, tr } = state;
        const range =
          getMarkRange(
            doc.resolve(state.selection.from),
            this.editor.schema.marks.code_inline
          ) ||
          getMarkRange(
            doc.resolve(state.selection.to),
            this.editor.schema.marks.code_inline
          );

        if (range) {
          const $end = doc.resolve(range.to);
          tr.setSelection(new TextSelection($end, $end));
          dispatch?.(tr);

          copy(tr.doc.textBetween(state.selection.from, state.selection.to));
          toast.message(this.options.dictionary.codeCopied);
          return true;
        }

        return false;
      },
      expandCodeBlock: (): Command => (state, dispatch) => {
        const codeBlock =
          state.selection instanceof NodeSelection &&
          isCode(state.selection.node)
            ? { pos: state.selection.from, node: state.selection.node }
            : findParentNode(isCode)(state.selection);
        if (!codeBlock) {
          return false;
        }
        const lineCount = getCollapsibleLineCount(codeBlock.node);
        if (!lineCount || lineCount < MIN_LINES_FOR_TRUNCATION) {
          return false;
        }
        const expandedSet = codeCollapsePluginKey.getState(state);
        if (expandedSet?.has(codeBlock.pos)) {
          return false;
        }
        if (dispatch) {
          dispatch(
            state.tr.setMeta(codeCollapsePluginKey, {
              type: "expand",
              pos: codeBlock.pos,
            })
          );
        }
        return true;
      },
      collapseCodeBlock: (): Command => (state, dispatch) => {
        const codeBlock =
          state.selection instanceof NodeSelection &&
          isCode(state.selection.node)
            ? { pos: state.selection.from, node: state.selection.node }
            : findParentNode(isCode)(state.selection);
        if (!codeBlock) {
          return false;
        }
        const lineCount = getCollapsibleLineCount(codeBlock.node);
        if (!lineCount || lineCount < MIN_LINES_FOR_TRUNCATION) {
          return false;
        }
        const expandedSet = codeCollapsePluginKey.getState(state);
        if (!expandedSet?.has(codeBlock.pos)) {
          return false;
        }
        if (dispatch) {
          // Move the cursor to just after the code block so the auto-expand
          // appendTransaction does not immediately re-expand the block.
          const afterPos = codeBlock.pos + codeBlock.node.nodeSize;
          dispatch(
            state.tr
              .setSelection(
                TextSelection.near(state.doc.resolve(afterPos))
              )
              .setMeta(codeCollapsePluginKey, {
                type: "collapse",
                pos: codeBlock.pos,
              })
          );
        }
        return true;
      },
    };
  }

  get allowInReadOnly() {
    return true;
  }

  keys({ type, schema }: { type: NodeType; schema: Schema }) {
    const output: Record<string, Command> = {
      // Both shortcuts work, but Shift-Ctrl-c matches the one in the menu
      "Shift-Ctrl-c": toggleBlockType(type, schema.nodes.paragraph),
      "Shift-Ctrl-\\": toggleBlockType(type, schema.nodes.paragraph),
      "Shift-Tab": outdentInCode,
      Tab: indentInCode,
      Enter: enterInCode,
      Backspace: backspaceToParagraph(type),
      "Shift-Enter": newlineInCode,
      "Mod-a": selectAll(type),
      "Mod-]": indentInCode,
      "Mod-[": outdentInCode,
    };

    if (isMac) {
      return {
        ...output,
        "Ctrl-a": moveToPreviousNewline,
        "Ctrl-e": moveToNextNewline,
      };
    }

    return output;
  }

  get plugins() {
    const createActiveCodeBlockDecoration = (state: EditorState) => {
      const codeBlock = findParentNode(isCode)(state.selection);
      if (!codeBlock) {
        return DecorationSet.empty;
      }

      if (isMermaid(codeBlock.node)) {
        const mermaidState = mermaidPluginKey.getState(state) as MermaidState;
        const decorations = mermaidState?.decorationSet.find(
          codeBlock.pos,
          codeBlock.pos + codeBlock.node.nodeSize
        );
        const nodeDecoration = decorations?.find(
          (d) => d.spec.diagramId && d.from === codeBlock.pos
        );
        const diagramId = nodeDecoration?.spec.diagramId;

        if (!diagramId || mermaidState?.editingId !== diagramId) {
          return DecorationSet.empty;
        }
      }

      const decoration = Decoration.node(
        codeBlock.pos,
        codeBlock.pos + codeBlock.node.nodeSize,
        { class: "code-active" }
      );
      return DecorationSet.create(state.doc, [decoration]);
    };

    return [
      CodeHighlighting({
        name: this.name,
        lineNumbers: this.showLineNumbers,
      }),
      this.name === "code_fence"
        ? Mermaid({
            isDark: this.editor.props.theme.isDark,
            editor: this.editor,
          })
        : undefined,
      new Plugin({
        key: codeCollapsePluginKey,
        state: {
          init: () => new Set<number>(),
          apply: (tr, pluginState) => {
            const meta = tr.getMeta(codeCollapsePluginKey) as
              | { type: "expand" | "collapse"; pos: number }
              | undefined;

            if (meta?.type === "expand") {
              const next = new Set(pluginState);
              next.add(meta.pos);
              return next;
            }

            if (meta?.type === "collapse") {
              const next = new Set(pluginState);
              next.delete(meta.pos);
              return next;
            }

            if (tr.docChanged) {
              // Map stored positions through the transform so they stay valid.
              // The bias of +1 (forward) ensures that if a deletion spans exactly
              // the node boundary, the position is not incorrectly reported as deleted.
              const next = new Set<number>();
              for (const pos of pluginState) {
                const mapped = tr.mapping.mapResult(pos, 1);
                if (!mapped.deleted) {
                  next.add(mapped.pos);
                }
              }
              return next;
            }

            return pluginState;
          },
        },
        props: {
          decorations: (state) => {
            const expandedSet = codeCollapsePluginKey.getState(state);
            if (!expandedSet) {
              return DecorationSet.empty;
            }

            const decorations: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              const lineCount = getCollapsibleLineCount(node);
              if (
                lineCount !== undefined &&
                lineCount >= MIN_LINES_FOR_TRUNCATION &&
                !expandedSet.has(pos)
              ) {
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, {
                    class: "code-block-collapsed",
                  })
                );
              }
            });

            return DecorationSet.create(state.doc, decorations);
          },
        },
        appendTransaction: (trs, _oldState, newState) => {
          // Auto-expand a collapsed code block when the cursor moves into it
          const selectionChanged = trs.some((t) => t.selectionSet);
          if (!selectionChanged) {
            return null;
          }

          const codeBlock =
            newState.selection instanceof NodeSelection &&
            isCode(newState.selection.node)
              ? { pos: newState.selection.from, node: newState.selection.node }
              : findParentNode(isCode)(newState.selection);
          if (!codeBlock) {
            return null;
          }

          const lineCount = getCollapsibleLineCount(codeBlock.node);
          if (!lineCount || lineCount < MIN_LINES_FOR_TRUNCATION) {
            return null;
          }

          const expandedSet = codeCollapsePluginKey.getState(newState);
          if (expandedSet?.has(codeBlock.pos)) {
            // Already expanded — nothing to do
            return null;
          }

          return newState.tr.setMeta(codeCollapsePluginKey, {
            type: "expand",
            pos: codeBlock.pos,
          });
        },
      }),
      new Plugin({
        key: new PluginKey("code-fence-split"),
        props: {
          handleTextInput: (view, _from, _to, text) => {
            if (text === "`") {
              const { state, dispatch } = view;
              return splitCodeBlockOnTripleBackticks(state, dispatch);
            }
            return false;
          },
        },
      }),
      new Plugin({
        key: new PluginKey("triple-click"),
        props: {
          handleDOMEvents: {
            mousedown(view, event) {
              const { dispatch, state } = view;
              const {
                selection: { $from, $to },
              } = state;
              if (
                $from.sameParent($to) &&
                event.detail === 3 &&
                isInCode(view.state, { onlyBlock: true })
              ) {
                dispatch?.(
                  state.tr
                    .setSelection(
                      TextSelection.create(
                        state.doc,
                        findPreviousNewline($from),
                        findNextNewline($from)
                      )
                    )
                    .scrollIntoView()
                );

                event.preventDefault();
                return true;
              }

              return false;
            },
          },
        },
      }),
      new Plugin({
        key: new PluginKey("code-fence-active"),
        state: {
          init: (_, state) => createActiveCodeBlockDecoration(state),
          apply: (tr, pluginState, oldState, newState) => {
            // Only recompute if selection or document changed
            if (
              !tr.selectionSet &&
              !tr.docChanged &&
              !tr.getMeta(mermaidPluginKey)
            ) {
              return pluginState;
            }

            return createActiveCodeBlockDecoration(newState);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ].filter(Boolean) as Plugin[];
  }

  inputRules({ type }: { type: NodeType }) {
    return [
      textblockTypeInputRule(/^```$/, type, () => ({
        language: getRecentlyUsedCodeLanguage() ?? DEFAULT_LANGUAGE,
      })),
    ];
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.write("```" + (node.attrs.language || "") + "\n");
    state.text(node.textContent, false);
    state.ensureNewLine();
    state.write("```");
    state.closeBlock(node);
  }

  get markdownToken() {
    return "fence";
  }

  parseMarkdown() {
    return {
      block: "code_block",
      getAttrs: (tok: Token) => ({ language: tok.info }),
      noCloseToken: true,
    };
  }
}
