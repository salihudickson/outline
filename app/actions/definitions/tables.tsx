import {
  TrashIcon,
  InsertAboveIcon,
  InsertBelowIcon,
  TableHeaderRowIcon,
  TableSplitCellsIcon,
  TableMergeCellsIcon,
} from "outline-icons";
import { ArrowDownIcon, ArrowUpIcon } from "~/components/Icons/ArrowIcon";
import { createAction } from "~/actions";
import { ActiveDocumentSection } from "~/actions/sections";

/**
 * Table row actions for use in the editor.
 * 
 * Note: These actions are designed for the editor's table system and require
 * special handling since tables are ProseMirror nodes, not React components.
 */

/**
 * Action to toggle header row in a table.
 */
export const toggleTableHeaderRow = createAction({
  name: ({ t }) => t("Toggle header"),
  analyticsName: "Toggle table header row",
  section: ActiveDocumentSection,
  icon: <TableHeaderRowIcon />,
  perform: () => {
    // This action is handled by the editor command system
  },
});

/**
 * Action to add a row before the current row.
 */
export const addTableRowBefore = createAction({
  name: ({ t }) => t("Add row before"),
  analyticsName: "Add table row before",
  section: ActiveDocumentSection,
  icon: <InsertAboveIcon />,
  perform: () => {
    // This action is handled by the editor command system
  },
});

/**
 * Action to add a row after the current row.
 */
export const addTableRowAfter = createAction({
  name: ({ t }) => t("Add row after"),
  analyticsName: "Add table row after",
  section: ActiveDocumentSection,
  icon: <InsertBelowIcon />,
  perform: () => {
    // This action is handled by the editor command system
  },
});

/**
 * Action to move a table row up.
 */
export const moveTableRowUp = createAction({
  name: ({ t }) => t("Move row up"),
  analyticsName: "Move table row up",
  section: ActiveDocumentSection,
  icon: <ArrowUpIcon />,
  perform: () => {
    // This action is handled by the editor command system
  },
});

/**
 * Action to move a table row down.
 */
export const moveTableRowDown = createAction({
  name: ({ t }) => t("Move row down"),
  analyticsName: "Move table row down",
  section: ActiveDocumentSection,
  icon: <ArrowDownIcon />,
  perform: () => {
    // This action is handled by the editor command system
  },
});

/**
 * Action to merge selected table cells.
 */
export const mergeTableCells = createAction({
  name: ({ t }) => t("Merge cells"),
  analyticsName: "Merge table cells",
  section: ActiveDocumentSection,
  icon: <TableMergeCellsIcon />,
  perform: () => {
    // This action is handled by the editor command system
  },
});

/**
 * Action to split a merged table cell.
 */
export const splitTableCell = createAction({
  name: ({ t }) => t("Split cell"),
  analyticsName: "Split table cell",
  section: ActiveDocumentSection,
  icon: <TableSplitCellsIcon />,
  perform: () => {
    // This action is handled by the editor command system
  },
});

/**
 * Action to delete the current table row.
 */
export const deleteTableRow = createAction({
  name: ({ t }) => t("Delete row"),
  analyticsName: "Delete table row",
  section: ActiveDocumentSection,
  icon: <TrashIcon />,
  dangerous: true,
  perform: () => {
    // This action is handled by the editor command system
  },
});

export const rootTableRowActions = [
  toggleTableHeaderRow,
  addTableRowBefore,
  addTableRowAfter,
  moveTableRowUp,
  moveTableRowDown,
  mergeTableCells,
  splitTableCell,
  deleteTableRow,
];
