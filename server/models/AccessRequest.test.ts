import { buildDocument, buildUser } from "@server/test/factories";
import { AccessRequest, AccessRequestStatus } from "./AccessRequest";

describe("AccessRequest", () => {
  describe("hasPendingRequest", () => {
    it("should return false when no pending requests exist", async () => {
      const user = await buildUser();
      const document = await buildDocument();

      const hasPending = await AccessRequest.hasPendingRequest({
        userId: user.id,
        documentId: document.id,
      });

      expect(hasPending).toBe(false);
    });

    it("should return true when a pending request exists", async () => {
      const user = await buildUser();
      const document = await buildDocument();

      await AccessRequest.create({
        requestedById: user.id,
        documentId: document.id,
        collectionId: null,
        resourceType: "document",
        status: AccessRequestStatus.Pending,
        teamId: user.teamId,
      });

      const hasPending = await AccessRequest.hasPendingRequest({
        userId: user.id,
        documentId: document.id,
      });

      expect(hasPending).toBe(true);
    });

    it("should return false when request is already approved", async () => {
      const user = await buildUser();
      const document = await buildDocument();

      await AccessRequest.create({
        requestedById: user.id,
        documentId: document.id,
        collectionId: null,
        resourceType: "document",
        status: AccessRequestStatus.Approved,
        teamId: user.teamId,
      });

      const hasPending = await AccessRequest.hasPendingRequest({
        userId: user.id,
        documentId: document.id,
      });

      expect(hasPending).toBe(false);
    });

    it("should return false when request is dismissed", async () => {
      const user = await buildUser();
      const document = await buildDocument();

      await AccessRequest.create({
        requestedById: user.id,
        documentId: document.id,
        collectionId: null,
        resourceType: "document",
        status: AccessRequestStatus.Dismissed,
        teamId: user.teamId,
      });

      const hasPending = await AccessRequest.hasPendingRequest({
        userId: user.id,
        documentId: document.id,
      });

      expect(hasPending).toBe(false);
    });
  });
});
