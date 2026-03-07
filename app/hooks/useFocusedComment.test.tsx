import ReactDOM from "react-dom";
import type { ReactNode } from "react";
import { act } from "react-dom/test-utils";
import { createMemoryHistory } from "history";
import { observer, Provider } from "mobx-react";
import { Router } from "react-router-dom";
import { DocumentContextProvider, useDocumentContext } from "~/components/DocumentContext";
import stores from "~/stores";
import Comment from "~/models/Comment";
import { useFocusedComment } from "./useFocusedComment";

/**
 * Renders the useFocusedComment hook inside all required providers and returns
 * the last rendered result via a callback.
 */
function createTestSetup(history: ReturnType<typeof createMemoryHistory>) {
  let result: ReturnType<typeof useFocusedComment> = undefined;
  let capturedContext: ReturnType<typeof useDocumentContext> | null = null;

  function ContextCapture({ children }: { children: ReactNode }) {
    capturedContext = useDocumentContext();
    return <>{children}</>;
  }

  // Wrap in observer so the component re-renders on MobX observable changes
  // (e.g. context.focusedCommentId updates).
  const HookComponent = observer(function HookComponent() {
    result = useFocusedComment();
    return null;
  });

  const element = (
    <Provider {...stores}>
      <Router history={history}>
        <DocumentContextProvider>
          <ContextCapture>
            <HookComponent />
          </ContextCapture>
        </DocumentContextProvider>
      </Router>
    </Provider>
  );

  return { element, getResult: () => result, getContext: () => capturedContext };
}

describe("useFocusedComment", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    stores.comments.clear();
  });

  afterEach(() => {
    ReactDOM.unmountComponentAtNode(container);
    container.remove();
  });

  it("returns undefined when no commentId is in URL or context", () => {
    const history = createMemoryHistory({ initialEntries: ["/doc/test"] });
    const { element, getResult } = createTestSetup(history);

    act(() => {
      ReactDOM.render(element, container);
    });

    expect(getResult()).toBeUndefined();
  });

  it("returns undefined when commentId is in URL but the comment is not loaded in the store", () => {
    const history = createMemoryHistory({
      initialEntries: ["/doc/test?commentId=non-existent-id"],
    });
    const { element, getResult } = createTestSetup(history);

    act(() => {
      ReactDOM.render(element, container);
    });

    expect(getResult()).toBeUndefined();
  });

  it("returns the comment when its id is in the URL and is in the store", () => {
    stores.comments.add({
      id: "thread-1",
      documentId: "doc-1",
      parentCommentId: null,
      data: { type: "doc", content: [] },
      createdById: "user-1",
    });

    const history = createMemoryHistory({
      initialEntries: ["/doc/test?commentId=thread-1"],
    });
    const { element, getResult } = createTestSetup(history);

    act(() => {
      ReactDOM.render(element, container);
    });

    expect(getResult()).toBeDefined();
    expect((getResult() as Comment).id).toBe("thread-1");
  });

  it("returns the parent thread when the URL commentId points to a reply", () => {
    stores.comments.add({
      id: "root-comment",
      documentId: "doc-1",
      parentCommentId: null,
      data: { type: "doc", content: [] },
      createdById: "user-1",
    });
    stores.comments.add({
      id: "reply-comment",
      documentId: "doc-1",
      parentCommentId: "root-comment",
      data: { type: "doc", content: [] },
      createdById: "user-1",
    });

    const history = createMemoryHistory({
      initialEntries: ["/doc/test?commentId=reply-comment"],
    });
    const { element, getResult } = createTestSetup(history);

    act(() => {
      ReactDOM.render(element, container);
    });

    // Should return the root thread, not the reply
    expect(getResult()).toBeDefined();
    expect((getResult() as Comment).id).toBe("root-comment");
  });

  it("uses URL query param over a stale context value when both are present", () => {
    // This test reproduces the primary bug:
    // When a user already has a document open with Thread A focused (stored in
    // context), and then navigates to the same document via an email link for
    // Thread B (?commentId=thread-b), the hook must use Thread B from the URL
    // rather than the stale Thread A from the context.
    stores.comments.add({
      id: "thread-a",
      documentId: "doc-1",
      parentCommentId: null,
      data: { type: "doc", content: [] },
      createdById: "user-1",
    });
    stores.comments.add({
      id: "thread-b",
      documentId: "doc-1",
      parentCommentId: null,
      data: { type: "doc", content: [] },
      createdById: "user-1",
    });

    // Start on a URL with no commentId (thread-a is focused via user interaction)
    const history = createMemoryHistory({ initialEntries: ["/doc/test"] });
    const { element, getResult, getContext } = createTestSetup(history);

    act(() => {
      ReactDOM.render(element, container);
    });

    // Simulate the user interacting with thread-a (sets the context)
    act(() => {
      getContext()!.setFocusedCommentId("thread-a");
    });

    expect((getResult() as Comment).id).toBe("thread-a");

    // Now simulate the user opening the email link for thread-b, which
    // navigates to the same document page with ?commentId=thread-b
    act(() => {
      history.push("/doc/test?commentId=thread-b");
    });

    // The URL param must win over the stale context value.
    // Before the fix (`context.focusedCommentId || query.get("commentId")`),
    // this would return "thread-a" instead of "thread-b".
    expect(getResult()).toBeDefined();
    expect((getResult() as Comment).id).toBe("thread-b");
  });
});
