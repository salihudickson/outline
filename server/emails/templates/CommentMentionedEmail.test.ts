import {
  buildComment,
  buildDocument,
  buildUser,
} from "@server/test/factories";
import CommentMentionedEmail from "./CommentMentionedEmail";

describe("CommentMentionedEmail", () => {
  describe("beforeSend", () => {
    it("uses the root comment id as threadId for a top-level comment", async () => {
      const user = await buildUser();
      const document = await buildDocument({
        userId: user.id,
        teamId: user.teamId,
      });
      const rootComment = await buildComment({
        userId: user.id,
        documentId: document.id,
      });

      const props = {
        to: user.email,
        userId: user.id,
        documentId: document.id,
        actorName: user.name,
        commentId: rootComment.id,
        teamUrl: "https://example.com",
      };
      const email = new CommentMentionedEmail(props);
      const result = await (email as any).beforeSend(props);

      expect(result).not.toBe(false);
      expect(result.threadId).toBe(rootComment.id);
    });

    it("uses the parent comment id as threadId when the mention is in a reply", async () => {
      const user = await buildUser();
      const document = await buildDocument({
        userId: user.id,
        teamId: user.teamId,
      });
      const rootComment = await buildComment({
        userId: user.id,
        documentId: document.id,
      });
      const replyComment = await buildComment({
        userId: user.id,
        documentId: document.id,
        parentCommentId: rootComment.id,
      });

      const props = {
        to: user.email,
        userId: user.id,
        documentId: document.id,
        actorName: user.name,
        commentId: replyComment.id,
        teamUrl: "https://example.com",
      };
      const email = new CommentMentionedEmail(props);
      const result = await (email as any).beforeSend(props);

      expect(result).not.toBe(false);
      // The threadId must be the root comment's ID, not the reply's ID.
      // Before the fix, this would have used commentId (the reply ID) directly.
      expect(result.threadId).toBe(rootComment.id);
      expect(result.threadId).not.toBe(replyComment.id);
    });

    it("returns false when the collection does not exist", async () => {
      const user = await buildUser();
      const document = await buildDocument({
        userId: user.id,
        teamId: user.teamId,
        collectionId: null,
      });
      const rootComment = await buildComment({
        userId: user.id,
        documentId: document.id,
      });

      const props = {
        to: user.email,
        userId: user.id,
        documentId: document.id,
        actorName: user.name,
        commentId: rootComment.id,
        teamUrl: "https://example.com",
      };
      const email = new CommentMentionedEmail(props);
      const result = await (email as any).beforeSend(props);

      expect(result).toBe(false);
    });
  });
});
