import { observer } from "mobx-react";
import { ArchiveIcon, CrossIcon, MoveIcon, TrashIcon } from "outline-icons";
import { transparentize } from "polished";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { depths, s } from "@shared/styles";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import Text from "~/components/Text";
import Tooltip from "~/components/Tooltip";
import useStores from "~/hooks/useStores";
import BulkDeleteDialog from "./BulkDeleteDialog";
import BulkArchiveDialog from "./BulkArchiveDialog";
import BulkMoveDialog from "./BulkMoveDialog";

function BulkSelectionToolbar() {
  const { t } = useTranslation();
  const { documents, dialogs, policies } = useStores();
  const selectedCount = documents.selectedCount;

  if (!documents.isSelectionMode || selectedCount === 0) {
    return null;
  }

  const selectedDocuments = documents.selectedDocuments;

  // Check permissions for selected documents
  const canArchiveAll = selectedDocuments.every(
    (doc) => policies.abilities(doc.id).archive
  );
  const canDeleteAll = selectedDocuments.every(
    (doc) => policies.abilities(doc.id).delete
  );
  const canMoveAll = selectedDocuments.every(
    (doc) => policies.abilities(doc.id).move
  );

  const handleClear = () => {
    documents.clearSelection();
  };

  const handleArchive = () => {
    dialogs.openModal({
      title: t("Archive {{ count }} documents", { count: selectedCount }),
      content: (
        <BulkArchiveDialog
          documents={selectedDocuments}
          onSubmit={dialogs.closeAllModals}
        />
      ),
    });
  };

  const handleDelete = () => {
    dialogs.openModal({
      title: t("Delete {{ count }} documents", { count: selectedCount }),
      content: (
        <BulkDeleteDialog
          documents={selectedDocuments}
          onSubmit={dialogs.closeAllModals}
        />
      ),
    });
  };

  const handleMove = () => {
    dialogs.openModal({
      title: t("Move {{ count }} documents", { count: selectedCount }),
      content: (
        <BulkMoveDialog
          documents={selectedDocuments}
          onSubmit={dialogs.closeAllModals}
        />
      ),
    });
  };

  return (
    <Wrapper>
      <Inner align="center" justify="space-between">
        <Flex align="center" gap={12}>
          <Text type="secondary" size="small">
            {t("{{ count }} selected", { count: selectedCount })}
          </Text>
          <Tooltip content={t("Clear selection")} placement="top">
            <NudeButton onClick={handleClear}>
              <CrossIcon />
            </NudeButton>
          </Tooltip>
        </Flex>
        <Flex align="center" gap={8}>
          {canArchiveAll && (
            <Button onClick={handleArchive} icon={<ArchiveIcon />} neutral>
              {t("Archive")}
            </Button>
          )}
          {canMoveAll && (
            <Button onClick={handleMove} icon={<MoveIcon />} neutral>
              {t("Move")}
            </Button>
          )}
          {canDeleteAll && (
            <Button onClick={handleDelete} icon={<TrashIcon />} danger>
              {t("Delete")}
            </Button>
          )}
        </Flex>
      </Inner>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: ${depths.editorToolbar};
`;

const Inner = styled(Flex)`
  background: ${s("background")};
  border: 1px solid ${s("inputBorder")};
  border-radius: 8px;
  padding: 8px 16px;
  box-shadow: 0 4px 12px ${(props) => transparentize(0.8, props.theme.text)};
  min-width: 320px;
  gap: 24px;
`;

export default observer(BulkSelectionToolbar);
