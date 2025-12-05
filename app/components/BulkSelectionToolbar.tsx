import { observer } from "mobx-react";
import { ArchiveIcon, CrossIcon, MoveIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { toast } from "sonner";
import { depths, s } from "@shared/styles";
import {
  MenuButton,
  MenuIconWrapper,
  MenuLabel,
  MenuSeparator,
  MenuHeader,
} from "~/components/primitives/components/Menu";
import { Portal } from "~/components/Portal";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import DocumentMove from "~/scenes/DocumentMove";
import useStores from "~/hooks/useStores";

function BulkSelectionToolbar() {
  const { t } = useTranslation();
  const { documents, dialogs, policies, ui } = useStores();
  const selectedCount = documents.selectedCount;
  const selectedDocuments = documents.selectedDocuments;
  const sidebarWidth = ui.sidebarWidth;

  const canArchiveAll = selectedDocuments.every(
    (doc) => policies.abilities(doc.id).archive
  );
  const canDeleteAll = selectedDocuments.every(
    (doc) => policies.abilities(doc.id).delete
  );
  const canMoveAll = selectedDocuments.every(
    (doc) => policies.abilities(doc.id).move
  );

  const handleClear = React.useCallback(() => {
    documents.clearSelection();
  }, [documents]);

  const handleArchive = React.useCallback(() => {
    const count = selectedDocuments.length;
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
  }, [dialogs, selectedDocuments, documents, t]);

  const handleDelete = React.useCallback(() => {
    const count = selectedDocuments.length;
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
  }, [dialogs, selectedDocuments, documents, t]);

  const handleMove = React.useCallback(() => {
    const count = selectedDocuments.length;
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
  }, [dialogs, selectedDocuments, documents, t]);

  if (selectedCount === 0) {
    return null;
  }

  return (
    <Portal>
      <Wrapper $sidebarWidth={sidebarWidth}>
        <MenuContainer>
          <MenuHeader>
            {t("{{ count }} selected", { count: selectedCount })}
          </MenuHeader>
          {canArchiveAll && (
            <MenuButton onClick={handleArchive}>
              <MenuIconWrapper>
                <ArchiveIcon />
              </MenuIconWrapper>
              <MenuLabel>{t("Archive")}…</MenuLabel>
            </MenuButton>
          )}
          {canMoveAll && (
            <MenuButton onClick={handleMove}>
              <MenuIconWrapper>
                <MoveIcon />
              </MenuIconWrapper>
              <MenuLabel>{t("Move")}…</MenuLabel>
            </MenuButton>
          )}
          {canDeleteAll && (
            <MenuButton onClick={handleDelete} $dangerous>
              <MenuIconWrapper>
                <TrashIcon />
              </MenuIconWrapper>
              <MenuLabel>{t("Delete")}…</MenuLabel>
            </MenuButton>
          )}
          <MenuSeparator />
          <MenuButton onClick={handleClear}>
            <MenuIconWrapper>
              <CrossIcon />
            </MenuIconWrapper>
            <MenuLabel>{t("Clear selection")}</MenuLabel>
          </MenuButton>
        </MenuContainer>
      </Wrapper>
    </Portal>
  );
}

const Wrapper = styled.div<{ $sidebarWidth: number }>`
  position: fixed;
  bottom: 24px;
  left: ${(props) => props.$sidebarWidth + 16}px;
  z-index: ${depths.menu};
`;

const MenuContainer = styled.div`
  min-width: 180px;
  max-width: 276px;
  background: ${s("menuBackground")};
  box-shadow: ${s("menuShadow")};
  border-radius: 6px;
  padding: 6px;

  ${breakpoint("tablet")`
    min-width: 160px;
  `}
`;

export default observer(BulkSelectionToolbar);
