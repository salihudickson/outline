import React, { useCallback, useMemo, useRef } from "react";
import { Portal } from "~/components/Portal";
import { Menu } from "~/components/primitives/Menu";
import type { MenuItem } from "@shared/editor/types";
import { MenuContent } from "~/components/primitives/Menu";
import { toMenuItems } from "~/components/Menu/transformer";
import EventBoundary from "@shared/components/EventBoundary";
import { MenuProvider } from "~/components/primitives/Menu/MenuContext";
import { mapMenuItems } from "./ToolbarMenu";
import { useEditor } from "./EditorContext";
import { useTranslation } from "react-i18next";
import { usePosition } from "./FloatingToolbar";
import useMobile from "~/hooks/useMobile";

type Props = {
  items: MenuItem[];
  containerRef?: React.MutableRefObject<HTMLDivElement | null>;
};

export const isParentMenu = (parentId: string, childId: string) =>
  childId.startsWith(parentId);

/*
 * Renders an inline menu in the floating toolbar, which does not require a trigger.
 */
const InlineMenu: React.FC<Props> = ({ items, containerRef }) => {
  const { t } = useTranslation();
  const { commands, view } = useEditor();
  const fallbackRef = useRef<HTMLDivElement | null>(null);
  const menuRef = containerRef || fallbackRef;
  const isMobile = useMobile();

  const pos = usePosition({
    menuRef,
    active: true,
    inline: true,
  });

  const handleCloseAutoFocus = useCallback((ev: Event) => {
    ev.stopImmediatePropagation();
  }, []);

  const mappedItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        children: item.children
          ? mapMenuItems(item.children, commands, view.state)
          : [],
      })),
    [items, commands, view.state]
  );

  const content = (
    <MenuProvider variant="inline">
      <Menu>
        <MenuContent
          pos={pos}
          align="end"
          aria-label={t("Options")}
          onCloseAutoFocus={handleCloseAutoFocus}
        >
          <EventBoundary>
            {mappedItems.map((item) => toMenuItems(item.children || []))}
          </EventBoundary>
        </MenuContent>
      </Menu>
    </MenuProvider>
  );

  return isMobile ? content : <Portal>{content}</Portal>;
};

export default InlineMenu;
