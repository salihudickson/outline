import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { depths, s } from "@shared/styles";
import { actionV2ToMenuItem } from "~/actions";
import { MenuHeader } from "~/components/primitives/components/Menu";
import { toMenuItems } from "~/components/Menu/transformer";
import { MenuProvider } from "~/components/primitives/Menu/MenuContext";
import { Portal } from "~/components/Portal";
import useActionContext from "~/hooks/useActionContext";
import { useBulkDocumentMenuAction } from "~/hooks/useBulkDocumentMenuAction";
import useStores from "~/hooks/useStores";
import { useComputed } from "~/hooks/useComputed";

function BulkSelectionToolbar() {
  const { t } = useTranslation();
  const { documents, ui } = useStores();
  const selectedCount = documents.selectedCount;
  const sidebarWidth = ui.sidebarWidth;

  const rootAction = useBulkDocumentMenuAction();
  const actionContext = useActionContext({
    isMenu: true,
  });

  const menuItems = useComputed(() => {
    if (selectedCount === 0) {
      return [];
    }

    return rootAction.children.map((childAction) =>
      actionV2ToMenuItem(childAction, actionContext)
    );
  }, [selectedCount, rootAction.children, actionContext]);

  if (selectedCount === 0) {
    return null;
  }

  const content = toMenuItems(menuItems);

  return (
    <Portal>
      <Wrapper $sidebarWidth={sidebarWidth}>
        <MenuProvider variant="dropdown">
          <MenuContainer>
            <MenuHeader>
              {t("{{ count }} selected", { count: selectedCount })}
            </MenuHeader>
            {content}
          </MenuContainer>
        </MenuProvider>
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
