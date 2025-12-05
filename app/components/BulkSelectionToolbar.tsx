import { observer } from "mobx-react";
import { ArchiveIcon, CrossIcon, MoveIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { depths, s } from "@shared/styles";
import {
  MenuButton,
  MenuIconWrapper,
  MenuLabel,
  MenuSeparator,
  MenuHeader,
} from "~/components/primitives/components/Menu";
import { Portal } from "~/components/Portal";
import useStores from "~/hooks/useStores";
import BulkArchiveDialog from "./BulkArchiveDialog";
import BulkDeleteDialog from "./BulkDeleteDialog";
import BulkMoveDialog from "./BulkMoveDialog";

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

  const handleClear = React.useCallback(
    (ev: React.MouseEvent<HTMLButtonElement>) => {
      ev.preventDefault();
      ev.stopPropagation();
      documents.clearSelection();
    },
    [documents]
  );

  const handleArchive = React.useCallback(
    (ev: React.MouseEvent<HTMLButtonElement>) => {
      ev.preventDefault();
      ev.stopPropagation();
      dialogs.openModal({
        title: t("Archive {{ count }} documents", { count: selectedCount }),
        content: (
          <BulkArchiveDialog
            documents={selectedDocuments}
            onSubmit={dialogs.closeAllModals}
          />
        ),
      });
    },
    [dialogs, selectedCount, selectedDocuments, t]
  );

  const handleDelete = React.useCallback(
    (ev: React.MouseEvent<HTMLButtonElement>) => {
      ev.preventDefault();
      ev.stopPropagation();
      dialogs.openModal({
        title: t("Delete {{ count }} documents", { count: selectedCount }),
        content: (
          <BulkDeleteDialog
            documents={selectedDocuments}
            onSubmit={dialogs.closeAllModals}
          />
        ),
      });
    },
    [dialogs, selectedCount, selectedDocuments, t]
  );

  const handleMove = React.useCallback(
    (ev: React.MouseEvent<HTMLButtonElement>) => {
      ev.preventDefault();
      ev.stopPropagation();
      dialogs.openModal({
        title: t("Move {{ count }} documents", { count: selectedCount }),
        content: (
          <BulkMoveDialog
            documents={selectedDocuments}
            onSubmit={dialogs.closeAllModals}
          />
        ),
      });
    },
    [dialogs, selectedCount, selectedDocuments, t]
  );

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
              <MenuLabel>{t("Archive")}</MenuLabel>
            </MenuButton>
          )}
          {canMoveAll && (
            <MenuButton onClick={handleMove}>
              <MenuIconWrapper>
                <MoveIcon />
              </MenuIconWrapper>
              <MenuLabel>{t("Move")}</MenuLabel>
            </MenuButton>
          )}
          {canDeleteAll && (
            <MenuButton onClick={handleDelete} $dangerous>
              <MenuIconWrapper>
                <TrashIcon />
              </MenuIconWrapper>
              <MenuLabel>{t("Delete")}</MenuLabel>
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
