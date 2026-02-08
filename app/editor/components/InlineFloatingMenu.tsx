import { useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { MenuItem } from "@shared/editor/types";
import EventBoundary from "@shared/components/EventBoundary";
import type { MenuItem as TMenuItem } from "~/types";
import { Portal } from "~/components/Portal";
import { MenuContent } from "~/components/primitives/Menu";
import { MenuProvider } from "~/components/primitives/Menu/MenuContext";
import { Menu } from "~/components/primitives/Menu";
import { toMenuItems } from "~/components/Menu/transformer";
import { useEditor } from "./EditorContext";
import { usePosition } from "./FloatingToolbar";

type Props = {
  items: MenuItem[];
  active?: boolean;
};

/**
 * Renders an inline floating menu that appears without a trigger button.
 * This is used for contextual menus like table row/column operations where
 * the menu should appear directly at the selection without a toolbar wrapper.
 */
export function InlineFloatingMenu(props: Props) {
  const { items, active } = props;
  const { commands, view } = useEditor();
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement | null>(null);
  
  const pos = usePosition({
    menuRef,
    active: active ?? true,
  });

  const handleClick = useCallback(
    (menuItem: MenuItem) => () => {
      if (!menuItem.name) {
        return;
      }

      if (commands[menuItem.name]) {
        commands[menuItem.name](
          typeof menuItem.attrs === "function"
            ? menuItem.attrs(view.state)
            : menuItem.attrs
        );
      } else if (menuItem.onClick) {
        menuItem.onClick();
      }
    },
    [commands, view.state]
  );

  const menuItems: TMenuItem[] = useMemo(() => {
    return items.flatMap((item) => {
      if (!item.children) {
        return [];
      }

      return item.children.map((child) => {
        if (child.name === "separator") {
          return { type: "separator" as const, visible: child.visible };
        }
        return {
          type: "button" as const,
          title: child.label,
          icon: child.icon,
          dangerous: child.dangerous,
          visible: child.visible,
          selected:
            child.active !== undefined
              ? child.active(view.state)
              : undefined,
          onClick: handleClick(child),
        };
      });
    });
  }, [items, handleClick, view.state]);

  const handleCloseAutoFocus = useCallback((ev: Event) => {
    ev.stopImmediatePropagation();
  }, []);

  if (!active || !pos.visible) {
    return null;
  }

  return (
    <Portal>
      <MenuProvider variant="inline">
        <Menu>
          <MenuContent
            ref={menuRef}
            pos={pos}
            align="end"
            aria-label={t("Options")}
            onCloseAutoFocus={handleCloseAutoFocus}
          >
            <EventBoundary>{toMenuItems(menuItems)}</EventBoundary>
          </MenuContent>
        </Menu>
      </MenuProvider>
    </Portal>
  );
}
