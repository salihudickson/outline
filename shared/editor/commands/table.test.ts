import {
  createEditorState,
  doc,
  table,
  td,
  th,
  tr,
} from "@shared/test/editor";
import { sortTable } from "./table";

describe("sortTable", () => {
  describe("with merged cells", () => {
    it("should not duplicate merged cell content when sorting", () => {
      // Create a table with a merged cell (colspan=2) in first data row
      // | Header 1 | Header 2 | Header 3 |
      // | A (merged across 2 cols) | C     |
      // | D        | E        | F        |
      const testTable = table([
        tr([th("Header 1"), th("Header 2"), th("Header 3")]),
        tr([td("A", { colspan: 2 }), td("C")]),
        tr([td("D"), td("E"), td("F")]),
      ]);

      const testDoc = doc(testTable);
      const state = createEditorState(testDoc);

      // Sort by first column ascending
      const command = sortTable({ index: 0, direction: "asc" });
      let newState = state;
      command(state, (tr) => {
        newState = state.apply(tr);
      });

      const newTable = newState.doc.firstChild!;

      // Header row should remain unchanged
      expect(newTable.child(0).childCount).toBe(3);
      expect(newTable.child(0).child(0).textContent).toBe("Header 1");
      expect(newTable.child(0).child(1).textContent).toBe("Header 2");
      expect(newTable.child(0).child(2).textContent).toBe("Header 3");

      // After sorting (A < D), the merged cell row should come first
      // The table should still have 3 columns, not more
      expect(newTable.childCount).toBe(3); // 1 header + 2 data rows

      // First data row should have the merged cell
      const firstDataRow = newTable.child(1);
      expect(firstDataRow.childCount).toBe(2); // One merged cell + one regular cell

      // Check the merged cell is preserved
      const mergedCell = firstDataRow.child(0);
      expect(mergedCell.attrs.colspan).toBe(2);
      expect(mergedCell.textContent).toBe("A");

      // Check the regular cell
      expect(firstDataRow.child(1).textContent).toBe("C");

      // Second data row should have 3 cells
      const secondDataRow = newTable.child(2);
      expect(secondDataRow.childCount).toBe(3);
      expect(secondDataRow.child(0).textContent).toBe("D");
      expect(secondDataRow.child(1).textContent).toBe("E");
      expect(secondDataRow.child(2).textContent).toBe("F");
    });

    it("should handle rowspan when sorting", () => {
      // Create a table with a cell that spans 2 rows
      // | H1 | H2 |
      // | A  | B  |
      // | C (rowspan=2) | D |
      // |    | E  |
      const testTable = table([
        tr([th("H1"), th("H2")]),
        tr([td("A"), td("B")]),
        tr([td("C", { rowspan: 2 }), td("D")]),
        tr([td("E")]),
      ]);

      const testDoc = doc(testTable);
      const state = createEditorState(testDoc);

      // Sort by first column
      const command = sortTable({ index: 0, direction: "asc" });
      let newState = state;
      command(state, (tr) => {
        newState = state.apply(tr);
      });

      const newTable = newState.doc.firstChild!;

      // Header row unchanged
      expect(newTable.child(0).childCount).toBe(2);

      // After sorting: A, C (with rowspan), then the row affected by C's rowspan
      // The table should maintain its integrity
      expect(newTable.childCount).toBe(4); // 1 header + 3 data rows

      // Check that rowspan is preserved
      const rowWithSpan = newTable.child(2);
      const cellWithRowspan = rowWithSpan.child(0);
      expect(cellWithRowspan.attrs.rowspan).toBe(2);
      expect(cellWithRowspan.textContent).toBe("C");
    });

    it("should sort correctly with multiple merged cells", () => {
      // Create a more complex table
      // | H1 | H2 | H3 |
      // | B (colspan=2) | C |
      // | A  | E  | F  |
      const testTable = table([
        tr([th("H1"), th("H2"), th("H3")]),
        tr([td("B", { colspan: 2 }), td("C")]),
        tr([td("A"), td("E"), td("F")]),
      ]);

      const testDoc = doc(testTable);
      const state = createEditorState(testDoc);

      // Sort by first column ascending (A should come before B)
      const command = sortTable({ index: 0, direction: "asc" });
      let newState = state;
      command(state, (tr) => {
        newState = state.apply(tr);
      });

      const newTable = newState.doc.firstChild!;

      // After sorting, row with "A" should be first
      expect(newTable.childCount).toBe(3);

      const firstDataRow = newTable.child(1);
      expect(firstDataRow.child(0).textContent).toBe("A");
      expect(firstDataRow.childCount).toBe(3);

      // Row with merged cell "B" should be second
      const secondDataRow = newTable.child(2);
      expect(secondDataRow.child(0).textContent).toBe("B");
      expect(secondDataRow.child(0).attrs.colspan).toBe(2);
      expect(secondDataRow.childCount).toBe(2);
    });
  });

  describe("without merged cells", () => {
    it("should sort simple table by text ascending", () => {
      const testTable = table([
        tr([th("Name"), th("Age")]),
        tr([td("Charlie"), td("30")]),
        tr([td("Alice"), td("25")]),
        tr([td("Bob"), td("35")]),
      ]);

      const testDoc = doc(testTable);
      const state = createEditorState(testDoc);

      const command = sortTable({ index: 0, direction: "asc" });
      let newState = state;
      command(state, (tr) => {
        newState = state.apply(tr);
      });

      const newTable = newState.doc.firstChild!;

      expect(newTable.child(1).child(0).textContent).toBe("Alice");
      expect(newTable.child(2).child(0).textContent).toBe("Bob");
      expect(newTable.child(3).child(0).textContent).toBe("Charlie");
    });

    it("should sort by numbers", () => {
      const testTable = table([
        tr([th("Name"), th("Age")]),
        tr([td("Charlie"), td("30")]),
        tr([td("Alice"), td("5")]),
        tr([td("Bob"), td("100")]),
      ]);

      const testDoc = doc(testTable);
      const state = createEditorState(testDoc);

      const command = sortTable({ index: 1, direction: "asc" });
      let newState = state;
      command(state, (tr) => {
        newState = state.apply(tr);
      });

      const newTable = newState.doc.firstChild!;

      expect(newTable.child(1).child(1).textContent).toBe("5");
      expect(newTable.child(2).child(1).textContent).toBe("30");
      expect(newTable.child(3).child(1).textContent).toBe("100");
    });

    it("should sort descending", () => {
      const testTable = table([
        tr([th("Name")]),
        tr([td("Alice")]),
        tr([td("Bob")]),
        tr([td("Charlie")]),
      ]);

      const testDoc = doc(testTable);
      const state = createEditorState(testDoc);

      const command = sortTable({ index: 0, direction: "desc" });
      let newState = state;
      command(state, (tr) => {
        newState = state.apply(tr);
      });

      const newTable = newState.doc.firstChild!;

      expect(newTable.child(1).child(0).textContent).toBe("Charlie");
      expect(newTable.child(2).child(0).textContent).toBe("Bob");
      expect(newTable.child(3).child(0).textContent).toBe("Alice");
    });
  });
});
