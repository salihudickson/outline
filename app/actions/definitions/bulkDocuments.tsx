import {
  ArchiveIcon,
  CrossIcon,
  MoveIcon,
  TrashIcon,
} from "outline-icons";
import { toast } from "sonner";
import Document from "~/models/Document";
import DocumentMove from "~/scenes/DocumentMove";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import { createActionV2, ActionV2Separator } from "~/actions";
import { DocumentSection } from "~/actions/sections";

/**
 * Creates a bulk archive action for the given documents.
 *
 * @param documents - documents to archive.
 * @param onComplete - callback to invoke when the action is complete.
 * @returns bulk archive action.
 */
export function createBulkArchiveAction(
  documents: Document[],
  onComplete: () => void
) {
  const count = documents.length;

  return createActionV2({
    name: ({ t }) => `${t("Archive")}…`,
    analyticsName: "Bulk archive documents",
    section: DocumentSection,
    icon: <ArchiveIcon />,
    visible: documents.every((doc) => doc.can.archive),
    perform: async ({ stores, t }) => {
      stores.dialogs.openModal({
        title: t("Archive {{ count }} documents", { count }),
        content: (
          <ConfirmationDialog
            onSubmit={async () => {
              const results = await Promise.allSettled(
                documents.map((doc) => doc.archive())
              );

              const succeeded = results.filter(
                (r) => r.status === "fulfilled"
              ).length;
              const failed = results.filter(
                (r) => r.status === "rejected"
              ).length;

              onComplete();
              stores.dialogs.closeAllModals();

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
}

/**
 * Creates a bulk move action for the given documents.
 *
 * @param documents - documents to move.
 * @param onComplete - callback to invoke when the action is complete.
 * @returns bulk move action.
 */
export function createBulkMoveAction(
  documents: Document[],
  onComplete: () => void
) {
  const count = documents.length;
  const firstDocument = documents[0];

  return createActionV2({
    name: ({ t }) => `${t("Move")}…`,
    analyticsName: "Bulk move documents",
    section: DocumentSection,
    icon: <MoveIcon />,
    visible: documents.every((doc) => doc.can.move),
    perform: async ({ stores, t }) => {
      stores.dialogs.openModal({
        title: t("Move {{ count }} documents", { count }),
        content: (
          <DocumentMove
            document={firstDocument}
            onSubmit={async (result) => {
              // Move remaining documents to the same destination
              const destination = result[0];
              if (destination && documents.length > 1) {
                const remainingDocs = documents.slice(1);
                await Promise.allSettled(
                  remainingDocs.map((doc) =>
                    doc.move({
                      collectionId: destination.collectionId,
                      parentDocumentId: destination.parentDocumentId,
                    })
                  )
                );
              }
              onComplete();
              stores.dialogs.closeAllModals();
              toast.success(t("Moved {{ count }} documents", { count }));
            }}
          />
        ),
      });
    },
  });
}

/**
 * Creates a bulk delete action for the given documents.
 *
 * @param documents - documents to delete.
 * @param onComplete - callback to invoke when the action is complete.
 * @returns bulk delete action.
 */
export function createBulkDeleteAction(
  documents: Document[],
  onComplete: () => void
) {
  const count = documents.length;

  return createActionV2({
    name: ({ t }) => `${t("Delete")}…`,
    analyticsName: "Bulk delete documents",
    section: DocumentSection,
    icon: <TrashIcon />,
    dangerous: true,
    visible: documents.every((doc) => doc.can.delete),
    perform: async ({ stores, t }) => {
      stores.dialogs.openModal({
        title: t("Delete {{ count }} documents", { count }),
        content: (
          <ConfirmationDialog
            onSubmit={async () => {
              const results = await Promise.allSettled(
                documents.map((doc) => doc.delete())
              );

              const succeeded = results.filter(
                (r) => r.status === "fulfilled"
              ).length;
              const failed = results.filter(
                (r) => r.status === "rejected"
              ).length;

              onComplete();
              stores.dialogs.closeAllModals();

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
}

/**
 * Creates a clear selection action.
 *
 * @param onClear - callback to invoke when the action is performed.
 * @returns clear selection action.
 */
export function createClearSelectionAction(onClear: () => void) {
  return createActionV2({
    name: ({ t }) => t("Clear selection"),
    analyticsName: "Clear document selection",
    section: DocumentSection,
    icon: <CrossIcon />,
    perform: () => {
      onClear();
    },
  });
}

export { ActionV2Separator };
