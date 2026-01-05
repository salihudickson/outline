import { Plugin } from "prosemirror-state";
import type { WidgetProps } from "@shared/editor/lib/Extension";
import Extension from "@shared/editor/lib/Extension";
import { TableGripMenu } from "../components/TableGripMenu";

/**
 * Extension that shows a dropdown menu at table row/column grips
 * when they are clicked, providing direct access to table operations.
 */
export default class TableGripMenuExtension extends Extension {
  get name() {
    return "table-grip-menu";
  }

  get allowInReadOnly() {
    return false;
  }

  get plugins(): Plugin[] {
    return [
      new Plugin({
        // Empty plugin just to register the extension
        // The actual rendering is handled by the widget component
      }),
    ];
  }

  widget = (props: WidgetProps) => {
    return <TableGripMenu {...props} />;
  };
}
