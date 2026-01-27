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
    it("should handle sorting when entire column is merged (rowspan)", () => {
      // Reproduce the user's scenario:
      // | Header 1      | Header 2 |
      // | Merged        | C        |
      // | (all cells    | A        |
      // | in column 1)  | B        |
      // 
      // When sorting by column 2, should sort A, B, C
      const testTable = table([
        tr([th("Header 1"), th("Header 2")]),
        tr([td("Merged", { rowspan: 3 }), td("C")]),
        tr([td("A")]),  // Only 1 cell because column 0 is spanned
        tr([td("B")]),  // Only 1 cell because column 0 is spanned
      ]);

      const testDoc = doc(testTable);
      const state = createEditorState(testDoc);

      // Sort by second column (index 1) ascending
      const command = sortTable({ index: 1, direction: "asc" });
      let newState = state;
      command(state, (tr) => {
        newState = state.apply(tr);
      });

      const newTable = newState.doc.firstChild!;

      // After sorting by column 1: A, B, C order
      expect(newTable.childCount).toBe(4); // 1 header + 3 data rows

      // The merged cell's rowspan is reset and rows are reordered
      // Row 1: empty cell, A
      // Row 2: empty cell, B
      // Row 3: Merged (unmerged), C
      const row1 = newTable.child(1);
      expect(row1.childCount).toBe(2);
      expect(row1.child(0).textContent).toBe(""); // Empty cell where merged cell was
      expect(row1.child(1).textContent).toBe("A");

      const row2 = newTable.child(2);
      expect(row2.childCount).toBe(2);
      expect(row2.child(0).textContent).toBe("");
      expect(row2.child(1).textContent).toBe("B");

      const row3 = newTable.child(3);
      expect(row3.childCount).toBe(2);
      expect(row3.child(0).textContent).toBe("Merged");
      expect(row3.child(0).attrs.rowspan).toBe(1); // Rowspan reset to 1
      expect(row3.child(1).textContent).toBe("C");
    });

    it("should sort by column index considering colspan", () => {
      // Create a table where we sort by the 3rd column (index 2)
      // | Header 1 | Header 2 | Header 3 |
      // | A (merged across 2 cols) | Z     |  <- Should come last (Z > C)
      // | D        | E        | C        |  <- Should come first (C < Z)
      const testTable = table([
        tr([th("Header 1"), th("Header 2"), th("Header 3")]),
        tr([td("A", { colspan: 2 }), td("Z")]),
        tr([td("D"), td("E"), td("C")]),
      ]);

      const testDoc = doc(testTable);
      const state = createEditorState(testDoc);

      // Sort by third column (index 2) ascending
      const command = sortTable({ index: 2, direction: "asc" });
      let newState = state;
      command(state, (tr) => {
        newState = state.apply(tr);
      });

      const newTable = newState.doc.firstChild!;

      // After sorting by column 2: C should come before Z
      expect(newTable.childCount).toBe(3); // 1 header + 2 data rows

      // First data row should be the one with C in column 2
      const firstDataRow = newTable.child(1);
      expect(firstDataRow.childCount).toBe(3);
      expect(firstDataRow.child(0).textContent).toBe("D");
      expect(firstDataRow.child(1).textContent).toBe("E");
      expect(firstDataRow.child(2).textContent).toBe("C");

      // Second data row should be the one with Z in column 2
      const secondDataRow = newTable.child(2);
      expect(secondDataRow.childCount).toBe(2);
      expect(secondDataRow.child(0).textContent).toBe("A");
      expect(secondDataRow.child(0).attrs.colspan).toBe(2);
      expect(secondDataRow.child(1).textContent).toBe("Z");
    });

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
