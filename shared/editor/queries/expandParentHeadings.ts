import type { Node } from "prosemirror-model";
import type { EditorView } from "prosemirror-view";
import { findBlockNodes } from "./findChildren";
import headingToSlug from "../lib/headingToSlug";
import Storage from "../../utils/Storage";
import { headingToPersistenceKey } from "../lib/headingToSlug";

/**
 * Expands all parent headings that are collapsed above the target heading with the given id.
 * This ensures that when navigating to a heading, it will be visible even if it's nested under
 * collapsed parent headings.
 *
 * @param view The ProseMirror editor view.
 * @param targetHeadingId The id of the heading to navigate to.
 * @param documentId Optional document id for persistence key.
 * @returns True if any headings were expanded.
 */
export function expandParentHeadings(
  view: EditorView,
  targetHeadingId: string,
  documentId?: string
): boolean {
  const { doc, tr } = view.state;
  const blocks = findBlockNodes(doc);

  // Find the target heading by its id
  const previouslySeen: Record<string, number> = {};
  let targetHeading: { node: Node; pos: number; level: number } | null = null;

  for (const block of blocks) {
    if (block.node.type.name === "heading") {
      const slug = headingToSlug(block.node);
      let id = slug;

      if (previouslySeen[slug] > 0) {
        id = headingToSlug(block.node, previouslySeen[slug]);
      }

      previouslySeen[slug] =
        previouslySeen[slug] !== undefined ? previouslySeen[slug] + 1 : 1;

      if (id === targetHeadingId) {
        targetHeading = {
          node: block.node,
          pos: block.pos,
          level: block.node.attrs.level,
        };
        break;
      }
    }
  }

  if (!targetHeading) {
    return false;
  }

  // Track parent headings using a stack
  // Each entry in the stack represents a heading level and its collapsed state
  const parentStack: Array<{ node: Node; pos: number; level: number }> = [];
  const collapsedParents: Array<{ node: Node; pos: number }> = [];

  for (const block of blocks) {
    if (block.pos >= targetHeading.pos) {
      // We've reached the target heading
      break;
    }

    if (block.node.type.name === "heading") {
      const level = block.node.attrs.level;

      // Pop stack until we find a parent with a lower level
      while (
        parentStack.length > 0 &&
        parentStack[parentStack.length - 1].level >= level
      ) {
        parentStack.pop();
      }

      // Add this heading to the parent stack
      parentStack.push({ node: block.node, pos: block.pos, level });

      // If this heading is collapsed and is a parent of our target, track it
      if (block.node.attrs.collapsed && level < targetHeading.level) {
        collapsedParents.push({ node: block.node, pos: block.pos });
      }
    }
  }

  // Filter collapsedParents to only include actual parents in the hierarchy
  // A heading is a parent if it's in the stack when we reach the target
  const actualParents = collapsedParents.filter((parent) =>
    // Check if this parent is in the actual parent chain of the target
    parentStack.some(
      (p) => p.pos === parent.pos && p.level < targetHeading.level
    )
  );

  // Expand all collapsed parent headings
  if (actualParents.length === 0) {
    return false;
  }

  let transaction = tr;
  for (const parent of actualParents) {
    transaction = transaction.setNodeMarkup(parent.pos, undefined, {
      ...parent.node.attrs,
      collapsed: false,
    });

    // Remove from persistence storage
    const persistKey = headingToPersistenceKey(parent.node, documentId);
    Storage.remove(persistKey);
  }

  view.dispatch(transaction);
  return true;
}
