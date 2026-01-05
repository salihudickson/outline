import * as React from "react";
import { observer } from "mobx-react";
import type { EditorView } from "prosemirror-view";
import { Menu, MenuContent } from "~/components/primitives/Menu";
import { MenuProvider } from "~/components/primitives/Menu/MenuContext";
import { toMenuItems } from "~/components/Menu/transformer";
import type { MenuItem } from "~/types";
import tableRowMenuItems from "../menus/tableRow";
import useDictionary from "~/hooks/useDictionary";
import { useEditor } from "./EditorContext";
import type { MenuItem as EditorMenuItem } from "@shared/editor/types";

type MenuState = {
  open: boolean;
  x: number;
  y: number;
  index: number;
  view?: EditorView;
};

/**
 * A context menu for table row grips that opens on click (left or right).
 * Listens for custom events dispatched from the TableRow plugin.
 */
export const TableRowGripMenu = observer(() => {
  const { view, commands } = useEditor();
  const dictionary = useDictionary();
  const [menuState, setMenuState] = React.useState<MenuState>({
    open: false,
    x: 0,
    y: 0,
    index: 0,
  });

  React.useEffect(() => {
    const handleGripMenuEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{
        index: number;
        clientX: number;
        clientY: number;
        view: EditorView;
      }>;

      setMenuState({
        open: true,
        x: customEvent.detail.clientX,
        y: customEvent.detail.clientY,
        index: customEvent.detail.index,
        view: customEvent.detail.view,
      });
    };

    // Listen for custom events from the TableRow plugin
    view.dom.addEventListener("table-row-grip-menu", handleGripMenuEvent);

    return () => {
      view.dom.removeEventListener("table-row-grip-menu", handleGripMenuEvent);
    };
  }, [view]);

  const handleOpenChange = React.useCallback((isOpen: boolean) => {
    setMenuState((prev) => ({ ...prev, open: isOpen }));
  }, []);

  const menuItems: MenuItem[] = React.useMemo(() => {
    if (!menuState.open || !menuState.view) {
      return [];
    }

    const { state } = menuState.view;
    const editorMenuItems = tableRowMenuItems(state, false, dictionary, {
      index: menuState.index,
    });

    const handleClick = (item: EditorMenuItem) => () => {
      if (!item.name) {
        return;
      }

      if (commands[item.name]) {
        commands[item.name](
          typeof item.attrs === "function" ? item.attrs(state) : item.attrs
        );
      } else if (item.onClick) {
        item.onClick();
      }
      
      // Close menu after action
      setMenuState((prev) => ({ ...prev, open: false }));
    };

    // Convert EditorMenuItem[] to MenuItem[] format expected by toMenuItems
    const convertItems = (items: EditorMenuItem[]): MenuItem[] => {
      const result: MenuItem[] = [];

      items.forEach((item) => {
        if (item.name === "separator" && item.visible !== false) {
          result.push({ type: "separator", visible: item.visible });
        } else if (item.visible !== false) {
          if (item.children) {
            // Submenu - flatten it since we don't need nested dropdowns
            const childItems = convertItems(item.children);
            result.push(...childItems);
          } else if (item.name) {
            // Regular button
            result.push({
              type: "button",
              title: item.label || item.tooltip || "",
              icon: item.icon,
              dangerous: item.dangerous,
              visible: item.visible,
              onClick: handleClick(item),
            });
          }
        }
      });

      return result;
    };

    return convertItems(editorMenuItems);
  }, [menuState, dictionary, commands]);

  if (!menuState.open) {
    return null;
  }

  const content = toMenuItems(menuItems);

  return (
    <MenuProvider variant="context">
      <Menu open={menuState.open} onOpenChange={handleOpenChange}>
        {/* Render menu at the clicked position */}
        <div
          style={{
            position: "fixed",
            left: menuState.x,
            top: menuState.y,
            width: 1,
            height: 1,
            pointerEvents: "none",
          }}
        />
        <MenuContent
          aria-label="Row actions"
          style={{
            position: "fixed",
            left: menuState.x,
            top: menuState.y,
          }}
        >
          {content}
        </MenuContent>
      </Menu>
    </MenuProvider>
  );
});
