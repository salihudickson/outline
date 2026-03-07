import type { Node as ProsemirrorNode } from "prosemirror-model";
import type { Decoration, EditorView, NodeView } from "prosemirror-view";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";

/** Minimum number of lines required to activate code block truncation. */
const MIN_LINES_FOR_TRUNCATION = 20;

/**
 * Custom NodeView for code fence blocks that wraps the code block with
 * expand/collapse truncation when the block contains many lines.
 *
 * Tall code blocks (>= MIN_LINES_FOR_TRUNCATION lines) are initially shown in
 * a collapsed/truncated state with a toggle button to expand or collapse them.
 * Clicking anywhere inside the collapsed code block also expands it.
 */
export class CodeFenceView implements NodeView {
  dom: HTMLDivElement;
  contentDOM: HTMLElement;

  private codeBlock: HTMLDivElement;
  private pre: HTMLPreElement;
  private gradient: HTMLDivElement;
  private toggleButton: HTMLButtonElement;
  private node: ProsemirrorNode;
  private showLineNumbers: boolean;
  private isTruncated: boolean = false;
  private isFirstRender: boolean = true;
  private expandLabel: string;
  private collapseLabel: string;

  constructor(
    node: ProsemirrorNode,
    _view: EditorView,
    _getPos: () => number | undefined,
    showLineNumbers: boolean,
    expandLabel: string,
    collapseLabel: string
  ) {
    this.node = node;
    this.showLineNumbers = showLineNumbers;
    this.expandLabel = expandLabel;
    this.collapseLabel = collapseLabel;

    // Build DOM structure
    this.dom = document.createElement("div");
    this.dom.className = EditorStyleHelper.codeBlockWrapper;

    // Inner code-block div (equivalent to toDOM output)
    this.codeBlock = document.createElement("div");

    // pre > code structure
    this.pre = document.createElement("pre");
    const code = document.createElement("code");
    code.setAttribute("spellcheck", "false");
    this.contentDOM = code;
    this.pre.appendChild(code);
    this.codeBlock.appendChild(this.pre);
    this.dom.appendChild(this.codeBlock);

    // Gradient overlay shown when collapsed
    this.gradient = document.createElement("div");
    this.gradient.className = EditorStyleHelper.codeBlockGradient;
    this.gradient.contentEditable = "false";
    this.dom.appendChild(this.gradient);

    // Toggle button for expand/collapse
    this.toggleButton = document.createElement("button");
    this.toggleButton.className = EditorStyleHelper.codeBlockToggle;
    this.toggleButton.contentEditable = "false";
    this.toggleButton.type = "button";
    this.dom.appendChild(this.toggleButton);

    // Event listeners
    this.toggleButton.addEventListener("mousedown", this.handleToggleClick);
    this.toggleButton.addEventListener("keydown", this.handleToggleKeyDown);
    this.pre.addEventListener("mousedown", this.handlePreClick);

    this.update(node, []);
  }

  private handleToggleClick = (event: MouseEvent) => {
    event.preventDefault();
    if (event.button !== 0) {
      return;
    }
    this.setTruncated(!this.isTruncated);
  };

  private handleToggleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.setTruncated(!this.isTruncated);
    }
  };

  private handlePreClick = () => {
    if (this.isTruncated) {
      this.setTruncated(false);
    }
  };

  private setTruncated(truncated: boolean) {
    this.isTruncated = truncated;
    this.codeBlock.classList.toggle(
      EditorStyleHelper.codeBlockCollapsed,
      truncated
    );
    this.gradient.style.display = truncated ? "" : "none";
    this.toggleButton.textContent = truncated
      ? this.expandLabel
      : this.collapseLabel;
  }

  /**
   * Updates the NodeView when the underlying ProseMirror node changes.
   *
   * @param node - the updated ProseMirror node.
   * @param decorations - active decorations applied to this node.
   * @returns true if the update was handled, false to let ProseMirror recreate the view.
   */
  update(node: ProsemirrorNode, decorations: readonly Decoration[]): boolean {
    if (node.type !== this.node.type) {
      return false;
    }
    this.node = node;

    const language = node.attrs.language || "";
    const wrap = node.attrs.wrap as boolean;
    const isMermaid = language === "mermaid" || language === "mermaidjs";

    // Replicate the class logic from CodeFence.toDOM
    this.codeBlock.className = `code-block${
      wrap
        ? " with-line-wrap"
        : this.showLineNumbers
          ? " with-line-numbers"
          : ""
    }`;
    this.codeBlock.setAttribute("data-language", language);

    // Propagate node decorations (e.g. "code-active") to the inner code-block
    // element so that existing CSS selectors continue to work correctly.
    const decorationClasses = decorations
      .map((d) => (d.spec as Record<string, unknown>).class)
      .filter((cls): cls is string => typeof cls === "string")
      .join(" ")
      .split(/\s+/)
      .filter(Boolean);
    const knownDecorationClasses = ["code-active"];
    for (const cls of knownDecorationClasses) {
      this.codeBlock.classList.toggle(
        cls,
        decorationClasses.includes(cls)
      );
    }

    // Count lines to determine if truncation controls should be shown.
    // A text with N newline characters has N+1 lines.
    const lineCount = (node.textContent.match(/\n/g) || []).length + 1;
    const shouldTruncate = !isMermaid && lineCount >= MIN_LINES_FOR_TRUNCATION;

    if (!shouldTruncate) {
      // Hide controls and ensure the code block is fully expanded
      this.toggleButton.style.display = "none";
      this.gradient.style.display = "none";
      if (this.isTruncated) {
        this.setTruncated(false);
      }
    } else {
      this.toggleButton.style.display = "";
      if (this.isFirstRender) {
        // Start in collapsed state on first render
        this.setTruncated(true);
      } else {
        // Preserve user's choice on subsequent updates (e.g., while typing)
        this.setTruncated(this.isTruncated);
      }
    }

    this.isFirstRender = false;
    return true;
  }

  /** Removes event listeners when the NodeView is destroyed. */
  destroy() {
    this.toggleButton.removeEventListener("mousedown", this.handleToggleClick);
    this.toggleButton.removeEventListener("keydown", this.handleToggleKeyDown);
    this.pre.removeEventListener("mousedown", this.handlePreClick);
  }
}
