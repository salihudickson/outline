import { useMemo } from "react";
import { ActionV2Separator } from "~/actions";
import {
  bulkArchiveDocuments,
  bulkMoveDocuments,
  bulkDeleteDocuments,
  clearDocumentSelection,
} from "~/actions/definitions/bulkDocuments";
import { useMenuAction } from "./useMenuAction";

/**
 * Hook that returns the root action for the bulk document selection menu.
 * This menu appears when one or more documents are selected in the sidebar.
 */
export function useBulkDocumentMenuAction() {
  const actions = useMemo(
    () => [
      bulkArchiveDocuments,
      bulkMoveDocuments,
      bulkDeleteDocuments,
      ActionV2Separator,
      clearDocumentSelection,
    ],
    []
  );

  return useMenuAction(actions);
}
