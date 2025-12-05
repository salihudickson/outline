import { useMemo } from "react";
import {
  createBulkArchiveAction,
  createBulkMoveAction,
  createBulkDeleteAction,
  createClearSelectionAction,
  ActionV2Separator,
} from "~/actions/definitions/bulkDocuments";
import Document from "~/models/Document";
import { useMenuAction } from "./useMenuAction";

type Props = {
  /** Documents that are selected */
  documents: Document[];
  /** Callback to clear selection */
  onClearSelection: () => void;
};

/**
 * Hook that creates bulk document menu actions.
 *
 * @param props - documents and callbacks.
 * @returns root menu action with children for bulk operations.
 */
export function useBulkDocumentMenuAction({
  documents,
  onClearSelection,
}: Props) {
  const actions = useMemo(() => {
    if (!documents.length) {
      return [];
    }

    return [
      createBulkArchiveAction(documents, onClearSelection),
      createBulkMoveAction(documents, onClearSelection),
      createBulkDeleteAction(documents, onClearSelection),
      ActionV2Separator,
      createClearSelectionAction(onClearSelection),
    ];
  }, [documents, onClearSelection]);

  return useMenuAction(actions);
}
