import type { Node as ProsemirrorNode } from "prosemirror-model";
import type { EditorView, NodeView } from "prosemirror-view";
import { isBrowser } from "../../utils/browser";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";

const MAX_HEIGHT = 350;

const CHEVRON_DOWN =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 7L8 11L12 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const CHEVRON_UP =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 11L8 7L12 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/**
 * Custom NodeView for code fence blocks. Renders the standard code block DOM
 * structure and injects an expand/collapse toggle button at the bottom whenever
 * the block is taller than 350 px or is already collapsed.
 */
export class CodeFenceView implements NodeView {
  dom: HTMLDivElement;
  contentDOM: HTMLElement;

  private pre: HTMLPreElement;
  private button: HTMLButtonElement;
  private node: ProsemirrorNode;
  private view: EditorView;
  private getPos: () => number | undefined;
  private showLineNumbers: boolean;
  private expandLabel: string;
  private collapseLabel: string;
  private hasAutoCollapsed = false;
  private resizeObserver: ResizeObserver | undefined;

  constructor(
    node: ProsemirrorNode,
    view: EditorView,
    getPos: () => number | undefined,
    showLineNumbers: boolean,
    expandLabel: string,
    collapseLabel: string
  ) {
    this.node = node;
    this.view = view;
    this.getPos = getPos;
    this.showLineNumbers = showLineNumbers;
    this.expandLabel = expandLabel;
    this.collapseLabel = collapseLabel;

    // Build the same DOM structure as the existing toDOM output so that the
    // CSS, CodeHighlighting decorations, and clipboard parsing all continue to
    // work as before.
    this.dom = document.createElement("div");
    this.dom.dataset.language = node.attrs.language;

    this.pre = document.createElement("pre");

    this.contentDOM = document.createElement("code");
    this.contentDOM.setAttribute("spellcheck", "false");

    this.pre.appendChild(this.contentDOM);
    this.dom.appendChild(this.pre);

    // Expand/collapse button – lives outside contentDOM so ProseMirror does
    // not treat it as document content.
    this.button = document.createElement("button");
    this.button.className = EditorStyleHelper.codeBlockToggle;
    this.button.contentEditable = "false";
    this.button.type = "button";
    // Hidden by default; shown when the block is tall or collapsed.
    this.button.style.display = "none";

    this.dom.appendChild(this.button);

    this.syncState();

    if (isBrowser) {
      this.button.addEventListener("mousedown", this.handleToggleClick);
      this.resizeObserver = new ResizeObserver(() => this.onResize());
      this.resizeObserver.observe(this.dom);
    }
  }

  private buildClassName(): string {
    const { collapsed, wrap } = this.node.attrs;
    const parts = ["code-block"];

    if (wrap) {
      parts.push("with-line-wrap");
    } else if (this.showLineNumbers) {
      parts.push("with-line-numbers");
    }

    if (collapsed) {
      parts.push("collapsed");
    }

    return parts.join(" ");
  }

  private syncState() {
    this.dom.className = this.buildClassName();
    this.dom.dataset.language = this.node.attrs.language;
    this.updateButton();
  }

  private updateButton() {
    const { collapsed } = this.node.attrs;

    // When not yet collapsed, we need a layout measurement; fall back to
    // showing nothing until the ResizeObserver fires with a real height.
    const isTall = collapsed || this.dom.scrollHeight > MAX_HEIGHT;

    if (!isTall) {
      this.button.style.display = "none";
      return;
    }

    if (collapsed) {
      this.button.innerHTML = `${CHEVRON_DOWN}<span>${this.expandLabel}</span>`;
    } else {
      this.button.innerHTML = `${CHEVRON_UP}<span>${this.collapseLabel}</span>`;
    }

    this.button.style.display = "inline-flex";
  }

  private onResize() {
    // Auto-collapse the first time a code block exceeds the max height so
    // that tall blocks are collapsed on initial document load (replacing the
    // previous broken auto-collapse-on-load plugin).
    if (
      !this.hasAutoCollapsed &&
      !this.node.attrs.collapsed &&
      this.dom.scrollHeight > MAX_HEIGHT
    ) {
      this.hasAutoCollapsed = true;
      const pos = this.getPos();

      if (pos !== undefined) {
        // Defer the dispatch to avoid mutating state inside a layout
        // measurement callback.
        requestAnimationFrame(() => {
          // Re-validate position and state before dispatching – the NodeView
          // may have been destroyed or the document may have changed between
          // the ResizeObserver callback and the animation frame.
          const currentPos = this.getPos();
          if (currentPos === undefined) {
            return;
          }
          const currentNode = this.view.state.doc.nodeAt(currentPos);
          if (!currentNode || currentNode.attrs.collapsed) {
            return;
          }
          this.view.dispatch(
            this.view.state.tr.setNodeMarkup(currentPos, undefined, {
              ...currentNode.attrs,
              collapsed: true,
            })
          );
        });
      }
      return;
    }

    this.updateButton();
  }

  private handleToggleClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const pos = this.getPos();
    if (pos === undefined) {
      return;
    }

    this.view.dispatch(
      this.view.state.tr.setNodeMarkup(pos, undefined, {
        ...this.node.attrs,
        collapsed: !this.node.attrs.collapsed,
      })
    );
  };

  /**
   * Called by ProseMirror whenever the node is updated. Return true to reuse
   * the existing DOM (and update it in place), false to recreate.
   *
   * @param node - the new node version.
   * @returns true when the DOM was updated in place.
   */
  update(node: ProsemirrorNode): boolean {
    if (node.type !== this.node.type) {
      return false;
    }

    this.node = node;
    this.syncState();
    return true;
  }

  /** Clean up event listeners and the ResizeObserver. */
  destroy() {
    this.resizeObserver?.disconnect();
    this.button.removeEventListener("mousedown", this.handleToggleClick);
  }
}
