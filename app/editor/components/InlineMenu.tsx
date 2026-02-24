import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

/*
 * Renders an inline menu in the floating toolbar, which does not require a trigger.
 */
const InlineMenu: React.FC<Props> = ({ items, containerRef }) => {
  const { t } = useTranslation();
  const { commands, view } = useEditor();
  const fallbackRef = useRef<HTMLDivElement | null>(null);
  const menuRef = containerRef || fallbackRef;
  const isMobile = useMobile();
  const [pos, setPos] = useState({ top: 0, left: 0 });

  // When true the menu is hidden without touching the ProseMirror selection.
  const [dismissed, setDismissed] = useState(false);
  // Record the selection position at dismissal so we know when to re-show.
  const dismissedAt = useRef<{ anchor: number; head: number } | null>(null);

  // Re-show the menu as soon as the selection moves to a different range.
  useEffect(() => {
    if (!dismissed || !dismissedAt.current) {
      return;
    }
    const { anchor, head } = view.state.selection;
    if (
      anchor !== dismissedAt.current.anchor ||
      head !== dismissedAt.current.head
    ) {
      setDismissed(false);
      dismissedAt.current = null;
    }
  }, [dismissed, view.state.selection]);

  const position = usePosition({
    menuRef,
    active: true,
    inline: true,
  });

  useEffect(() => {
    const viewportWidth = window.innerWidth;
    const menuRect = menuRef.current?.getBoundingClientRect();

    let left = position.left;
    if (menuRef.current && menuRect) {
      const spaceOnRight = viewportWidth - left;
      if (spaceOnRight < menuRect.right) {
        left = left - spaceOnRight; // double the space on the right
      }
    }

    setPos((prevPos) => {
      if (prevPos.top !== position.top || prevPos.left !== left) {
        return {
          top: position.top,
          left,
        };
      }
      return prevPos;
    });
  }, [menuRef, position]);

  const handleCloseAutoFocus = useCallback((ev: Event) => {
    ev.stopImmediatePropagation();
  }, []);

  /**
   * Hides the inline menu without collapsing the ProseMirror selection.
   * The menu re-appears automatically once the selection moves to a new range.
   */
  const handleCloseMenu = useCallback(() => {
    dismissedAt.current = {
      anchor: view.state.selection.anchor,
      head: view.state.selection.head,
    };
    setDismissed(true);
  }, [view]);

  const mappedItems = useMemo(
    () =>
      items.map((item) => {
        const children =
          typeof item.children === "function" ? item.children() : item.children;

        return {
          ...item,
          children: children
            ? mapMenuItems(children, commands, view.state)
            : [],
        };
      }),
    [items, commands, view.state]
  );

  if (dismissed) {
    return null;
  }

  const content = (
    <MenuProvider variant="inline" onCloseMenu={handleCloseMenu}>
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
