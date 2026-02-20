import {
  TrashIcon,
  AlignLeftIcon,
  AlignRightIcon,
  AlignCenterIcon,
  InsertLeftIcon,
  InsertRightIcon,
  TableHeaderColumnIcon,
  TableMergeCellsIcon,
  TableSplitCellsIcon,
  AlphabeticalSortIcon,
  AlphabeticalReverseSortIcon,
  TableColumnsDistributeIcon,
} from "outline-icons";
import type { EditorState } from "prosemirror-state";
import { CellSelection, selectedRect } from "prosemirror-tables";
import { isNodeActive } from "@shared/editor/queries/isNodeActive";
import {
  getAllSelectedColumns,
  isMergedCellSelection,
  isMultipleCellSelection,
} from "@shared/editor/queries/table";
import { MenuType, type MenuItem } from "@shared/editor/types";
import type { Dictionary } from "~/hooks/useDictionary";
import { ArrowLeftIcon, ArrowRightIcon } from "~/components/Icons/ArrowIcon";

export default function tableColMenuItems(
  state: EditorState,
  readOnly: boolean,
  dictionary: Dictionary,
  options: {
    index: number;
    rtl: boolean;
  }
): MenuItem[] {
  if (readOnly) {
    return [];
  }

  const { index, rtl } = options;
  const { schema, selection } = state;
  const selectedCols = getAllSelectedColumns(state);

  if (!(selection instanceof CellSelection)) {
    return [];
  }

  const tableMap = selectedRect(state);

  return [
    {
      type: MenuType.inline,
      children: [
        {
          label: dictionary.align,
          icon: <AlignCenterIcon />,
          children: [
            {
              name: "setColumnAttr",
              label: dictionary.alignLeft,
              icon: <AlignLeftIcon />,
              attrs: { index, alignment: "left" },
              active: isNodeActive(schema.nodes.th, {
                colspan: 1,
                rowspan: 1,
                alignment: "left",
              }),
            },
            {
              name: "setColumnAttr",
              label: dictionary.alignCenter,
              icon: <AlignCenterIcon />,
              attrs: { index, alignment: "center" },
              active: isNodeActive(schema.nodes.th, {
                colspan: 1,
                rowspan: 1,
                alignment: "center",
              }),
            },
            {
              name: "setColumnAttr",
              label: dictionary.alignRight,
              icon: <AlignRightIcon />,
              attrs: { index, alignment: "right" },
              active: isNodeActive(schema.nodes.th, {
                colspan: 1,
                rowspan: 1,
                alignment: "right",
              }),
            },
          ],
        },
        {
          label: dictionary.sort,
          icon: <AlphabeticalSortIcon />,
          children: [
            {
              name: "sortTable",
              label: dictionary.sortAsc,
              attrs: { index, direction: "asc" },
              icon: <AlphabeticalSortIcon />,
            },
            {
              name: "sortTable",
              label: dictionary.sortDesc,
              attrs: { index, direction: "desc" },
              icon: <AlphabeticalReverseSortIcon />,
            },
          ],
        },
        {
          name: "separator",
        },
        {
          name: "toggleHeaderColumn",
          label: dictionary.toggleHeader,
          icon: <TableHeaderColumnIcon />,
          visible: index === 0,
        },
        {
          name: rtl ? "addColumnAfter" : "addColumnBefore",
          label: rtl ? dictionary.addColumnAfter : dictionary.addColumnBefore,
          icon: <InsertLeftIcon />,
          attrs: { index },
        },
        {
          name: rtl ? "addColumnBefore" : "addColumnAfter",
          label: rtl ? dictionary.addColumnBefore : dictionary.addColumnAfter,
          icon: <InsertRightIcon />,
          attrs: { index },
        },
        {
          name: "moveTableColumn",
          label: dictionary.moveColumnLeft,
          icon: <ArrowLeftIcon />,
          attrs: { from: index, to: index - 1 },
          visible: index > 0,
        },
        {
          name: "moveTableColumn",
          label: dictionary.moveColumnRight,
          icon: <ArrowRightIcon />,
          attrs: { from: index, to: index + 1 },
          visible: index < tableMap.map.width - 1,
        },
        {
          name: "separator",
        },
        {
          name: "mergeCells",
          label: dictionary.mergeCells,
          icon: <TableMergeCellsIcon />,
          visible: isMultipleCellSelection(state),
        },
        {
          name: "splitCell",
          label: dictionary.splitCell,
          icon: <TableSplitCellsIcon />,
          visible: isMergedCellSelection(state),
        },
        {
          name: "distributeColumns",
          visible: selectedCols.length > 1,
          label: dictionary.distributeColumns,
          icon: <TableColumnsDistributeIcon />,
        },
        {
          name: "separator",
        },
        {
          name: "deleteColumn",
          dangerous: true,
          label: dictionary.deleteColumn,
          icon: <TrashIcon />,
        },
      ],
    },
  ];
}
