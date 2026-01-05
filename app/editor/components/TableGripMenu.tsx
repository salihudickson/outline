import * as React from "react";
import { createPortal } from "react-dom";
import { selectedRect } from "prosemirror-tables";
import { ColumnSelection } from "@shared/editor/selection/ColumnSelection";
import { RowSelection } from "@shared/editor/selection/RowSelection";
import { getColumnIndex, getRowIndex } from "@shared/editor/queries/table";
import { Menu, MenuContent, MenuTrigger } from "~/components/primitives/Menu";
import { MenuProvider } from "~/components/primitives/Menu/MenuContext";
import useDictionary from "~/hooks/useDictionary";
import { toMenuItems } from "~/components/Menu/transformer";
import getTableColMenuItems from "../menus/tableCol";
import getTableRowMenuItems from "../menus/tableRow";
import { useEditor } from "./EditorContext";
import EventBoundary from "~/components/EventBoundary";

/**
 * TableGripMenu renders a dropdown menu at the table row/column grip location
 * when a row or column is selected. This provides direct access to table operations
 * without needing to show a floating toolbar.
 */
export function TableGripMenu() {
  const { view, commands } = useEditor();
  const dictionary = useDictionary();
  const [menuState, setMenuState] = React.useState<{
    open: boolean;
    position: { top: number; left: number } | null;
    items: any[];
    type: "row" | "col" | null;
  }>({
    open: false,
    position: null,
    items: [],
    type: null,
  });

  React.useEffect(() => {
    const { state } = view;
    const { selection } = state;

    const isRowSelection =
      selection instanceof RowSelection && selection.isRowSelection();
    const isColSelection =
      selection instanceof ColumnSelection && selection.isColSelection();

    if (isRowSelection || isColSelection) {
      const rowIndex = getRowIndex(state);
      const colIndex = getColumnIndex(state);

      let items: any[] = [];
      let gripElement: HTMLElement | null = null;

      if (isRowSelection && rowIndex !== undefined) {
        items = getTableRowMenuItems(state, false, dictionary, {
          index: rowIndex,
        });

        // Find the row grip element
        const rect = selectedRect(state);
        const table = view.domAtPos(rect.tableStart);
        const rowElement = (table.node as HTMLElement).querySelector(
          `tr:nth-child(${rect.top + 1})`
        );
        if (rowElement instanceof HTMLElement) {
          // The grip is added by prosemirror-tables, look for it
          gripElement = rowElement.querySelector(
            ".grip-row"
          ) as HTMLElement | null;
          if (!gripElement) {
            // Fallback: use the first cell's position
            const firstCell = rowElement.querySelector(
              "*:first-child"
            ) as HTMLElement;
            if (firstCell) {
              const bounds = firstCell.getBoundingClientRect();
              setMenuState({
                open: true,
                position: {
                  top: bounds.top,
                  left: bounds.left - 40,
                },
                items,
                type: "row",
              });
              return;
            }
          }
        }
      } else if (isColSelection && colIndex !== undefined) {
        items = getTableColMenuItems(state, false, dictionary, {
          index: colIndex,
          rtl: false,
        });

        // Find the column grip element
        const rect = selectedRect(state);
        const table = view.domAtPos(rect.tableStart);
        const element = (table.node as HTMLElement).querySelector(
          `tr > *:nth-child(${rect.left + 1})`
        );
        if (element instanceof HTMLElement) {
          const bounds = element.getBoundingClientRect();
          setMenuState({
            open: true,
            position: {
              top: bounds.top - 40,
              left: bounds.left,
            },
            items,
            type: "col",
          });
          return;
        }
      }

      if (gripElement) {
        const bounds = gripElement.getBoundingClientRect();
        setMenuState({
          open: true,
          position: {
            top: bounds.bottom,
            left: bounds.left,
          },
          items,
          type: isRowSelection ? "row" : "col",
        });
      }
    } else {
      setMenuState({
        open: false,
        position: null,
        items: [],
        type: null,
      });
    }
  }, [view, view.state, view.state.selection, dictionary]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setMenuState((prev) => ({ ...prev, open: false }));
    }
  };

  if (!menuState.open || !menuState.position || menuState.items.length === 0) {
    return null;
  }

  // Filter out commands that don't exist
  const filteredItems = menuState.items
    .map((item) => {
      if (item.children) {
        return {
          ...item,
          children: item.children.filter((child: any) => {
            if (child.name === "separator") {
              return true;
            }
            if (child.name && !commands[child.name]) {
              return false;
            }
            if (child.visible === false) {
              return false;
            }
            return true;
          }),
        };
      }
      return item;
    })
    .filter((item) => {
      if (item.name === "separator") {
        return true;
      }
      if (item.name && !commands[item.name]) {
        return false;
      }
      if (item.visible === false) {
        return false;
      }
      return true;
    });

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: menuState.position.top,
        left: menuState.position.left,
        zIndex: 1000,
      }}
    >
      <MenuProvider variant="dropdown">
        <Menu open={menuState.open} onOpenChange={handleOpenChange}>
          <MenuTrigger asChild>
            <div style={{ width: 1, height: 1 }} />
          </MenuTrigger>
          <MenuContent>
            <EventBoundary>{toMenuItems(filteredItems)}</EventBoundary>
          </MenuContent>
        </Menu>
      </MenuProvider>
    </div>,
    document.body
  );
}
