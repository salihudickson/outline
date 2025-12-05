import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { depths, s } from "@shared/styles";
import { MenuHeader } from "~/components/primitives/components/Menu";
import { Portal } from "~/components/Portal";
import { toStaticMenuItems } from "~/components/Menu/transformer";
import { actionV2ToMenuItem } from "~/actions";
import { useBulkDocumentMenuAction } from "~/hooks/useBulkDocumentMenuAction";
import useActionContext from "~/hooks/useActionContext";
import useStores from "~/hooks/useStores";
import { ActionV2Variant } from "~/types";

function BulkSelectionToolbar() {
  const { t } = useTranslation();
  const { documents, ui } = useStores();
  const selectedCount = documents.selectedCount;
  const selectedDocuments = documents.selectedDocuments;
  const sidebarWidth = ui.sidebarWidth;

  const handleClearSelection = React.useCallback(() => {
    documents.clearSelection();
  }, [documents]);

  const rootAction = useBulkDocumentMenuAction({
    documents: selectedDocuments,
    onClearSelection: handleClearSelection,
  });

  const actionContext = useActionContext({
    isMenu: true,
  });

  const menuItems = React.useMemo(() => {
    if (!rootAction.children || selectedCount === 0) {
      return [];
    }

    return (rootAction.children as ActionV2Variant[]).map((childAction) =>
      actionV2ToMenuItem(childAction, actionContext)
    );
  }, [rootAction.children, selectedCount, actionContext]);

  const content = toStaticMenuItems(menuItems, handleClearSelection);

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
          {content}
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
