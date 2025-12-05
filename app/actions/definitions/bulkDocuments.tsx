import { ArchiveIcon, CrossIcon, MoveIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { toast } from "sonner";
import Document from "~/models/Document";
import DocumentMove from "~/scenes/DocumentMove";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import { createActionV2 } from "~/actions";
import { ActiveDocumentSection } from "~/actions/sections";

/**
 * Archive multiple documents at once.
 */
export const bulkArchiveDocuments = createActionV2({
  name: ({ t }) => `${t("Archive")}…`,
  analyticsName: "Bulk archive documents",
  section: ActiveDocumentSection,
  icon: <ArchiveIcon />,
  visible: ({ stores }) => {
    const selectedDocuments = stores.documents.selectedDocuments;
    if (selectedDocuments.length === 0) {
      return false;
    }
    return selectedDocuments.every(
      (doc) => stores.policies.abilities(doc.id).archive
    );
  },
  perform: async ({ stores, t }) => {
    const { dialogs, documents } = stores;
    const selectedDocuments = documents.selectedDocuments;
    const count = selectedDocuments.length;

    if (count === 0) {
      return;
    }

    dialogs.openModal({
      title: t("Archive {{ count }} documents", { count }),
      content: (
        <ConfirmationDialog
          onSubmit={async () => {
            const results = await Promise.allSettled(
              selectedDocuments.map((doc) => doc.archive())
            );
            
            const succeeded = results.filter(
              (r) => r.status === "fulfilled"
            ).length;
            const failed = results.filter(
              (r) => r.status === "rejected"
            ).length;

            documents.clearSelection();
            dialogs.closeAllModals();

            if (failed > 0) {
              toast.error(
                t("Archived {{ succeeded }} documents, {{ failed }} failed", {
                  succeeded,
                  failed,
                })
              );
            } else {
              toast.success(
                t("Archived {{ count }} documents", { count: succeeded })
              );
            }
          }}
          savingText={`${t("Archiving")}…`}
        >
          {t(
            "Are you sure you want to archive {{ count }} documents? They will be removed from collections and search results.",
            { count }
          )}
        </ConfirmationDialog>
      ),
    });
  },
});

/**
 * Move multiple documents at once.
 */
export const bulkMoveDocuments = createActionV2({
  name: ({ t }) => `${t("Move")}…`,
  analyticsName: "Bulk move documents",
  section: ActiveDocumentSection,
  icon: <MoveIcon />,
  visible: ({ stores }) => {
    const selectedDocuments = stores.documents.selectedDocuments;
    if (selectedDocuments.length === 0) {
      return false;
    }
    return selectedDocuments.every(
      (doc) => stores.policies.abilities(doc.id).move
    );
  },
  perform: ({ stores, t }) => {
    const { dialogs, documents } = stores;
    const selectedDocuments = documents.selectedDocuments;
    const count = selectedDocuments.length;

    if (count === 0) {
      return;
    }

    // For bulk move, we show the move dialog for the first document
    // The user will select a destination and we'll move all documents there
    const firstDocument = selectedDocuments[0];
    
    dialogs.openModal({
      title: t("Move {{ count }} documents", { count }),
      content: (
        <DocumentMove
          document={firstDocument}
          onSubmit={async (result) => {
            // Move remaining documents to the same destination
            const destination = result[0];
            if (destination && selectedDocuments.length > 1) {
              const remainingDocs = selectedDocuments.slice(1);
              await Promise.allSettled(
                remainingDocs.map((doc) =>
                  doc.move({
                    collectionId: destination.collectionId,
                    parentDocumentId: destination.parentDocumentId,
                  })
                )
              );
            }
            documents.clearSelection();
            dialogs.closeAllModals();
            toast.success(t("Moved {{ count }} documents", { count }));
          }}
        />
      ),
    });
  },
});

/**
 * Delete multiple documents at once.
 */
export const bulkDeleteDocuments = createActionV2({
  name: ({ t }) => `${t("Delete")}…`,
  analyticsName: "Bulk delete documents",
  section: ActiveDocumentSection,
  icon: <TrashIcon />,
  dangerous: true,
  visible: ({ stores }) => {
    const selectedDocuments = stores.documents.selectedDocuments;
    if (selectedDocuments.length === 0) {
      return false;
    }
    return selectedDocuments.every(
      (doc) => stores.policies.abilities(doc.id).delete
    );
  },
  perform: async ({ stores, t }) => {
    const { dialogs, documents } = stores;
    const selectedDocuments = documents.selectedDocuments;
    const count = selectedDocuments.length;

    if (count === 0) {
      return;
    }

    dialogs.openModal({
      title: t("Delete {{ count }} documents", { count }),
      content: (
        <ConfirmationDialog
          onSubmit={async () => {
            const results = await Promise.allSettled(
              selectedDocuments.map((doc) => doc.delete())
            );
            
            const succeeded = results.filter(
              (r) => r.status === "fulfilled"
            ).length;
            const failed = results.filter(
              (r) => r.status === "rejected"
            ).length;

            documents.clearSelection();
            dialogs.closeAllModals();

            if (failed > 0) {
              toast.error(
                t("Deleted {{ succeeded }} documents, {{ failed }} failed", {
                  succeeded,
                  failed,
                })
              );
            } else {
              toast.success(
                t("Deleted {{ count }} documents", { count: succeeded })
              );
            }
          }}
          savingText={`${t("Deleting")}…`}
          danger
        >
          {t(
            "Are you sure you want to delete {{ count }} documents? This action cannot be undone.",
            { count }
          )}
        </ConfirmationDialog>
      ),
    });
  },
});

/**
 * Clear the current selection.
 */
export const clearDocumentSelection = createActionV2({
  name: ({ t }) => t("Clear selection"),
  analyticsName: "Clear document selection",
  section: ActiveDocumentSection,
  icon: <CrossIcon />,
  visible: ({ stores }) => stores.documents.selectedCount > 0,
  perform: ({ stores }) => {
    stores.documents.clearSelection();
  },
});

export const rootBulkDocumentActions = [
  bulkArchiveDocuments,
  bulkMoveDocuments,
  bulkDeleteDocuments,
  clearDocumentSelection,
];
