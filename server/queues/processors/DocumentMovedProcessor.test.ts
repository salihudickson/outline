import { UserMembership, GroupMembership } from "@server/models";
import { DocumentPermission } from "@shared/types";
import {
  buildDocument,
  buildCollection,
  buildUser,
  buildTeam,
} from "@server/test/factories";
import DocumentMovedProcessor from "./DocumentMovedProcessor";

const ip = "127.0.0.1";

describe("DocumentMovedProcessor", () => {
  describe("documents.move", () => {
    it("should not reapply parent permissions to sibling documents when moving a document", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const user2 = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        userId: user.id,
        teamId: team.id,
      });

      // Create root document
      const rootDocument = await buildDocument({
        userId: user.id,
        collectionId: collection.id,
        teamId: team.id,
        title: "Root Document",
      });

      // Create 3 child documents under root
      const doc1 = await buildDocument({
        userId: user.id,
        collectionId: collection.id,
        teamId: team.id,
        title: "Document 1",
        parentDocumentId: rootDocument.id,
      });

      const doc2 = await buildDocument({
        userId: user.id,
        collectionId: collection.id,
        teamId: team.id,
        title: "Document 2",
        parentDocumentId: rootDocument.id,
      });

      const doc3 = await buildDocument({
        userId: user.id,
        collectionId: collection.id,
        teamId: team.id,
        title: "Document 3",
        parentDocumentId: rootDocument.id,
      });

      // Add user2 permission to root document (will be inherited by all children)
      const rootMembership = await UserMembership.create({
        userId: user2.id,
        documentId: rootDocument.id,
        permission: DocumentPermission.ReadWrite,
        createdById: user.id,
      });

      // Verify user2 has access to all documents via sourced memberships
      let doc1Memberships = await UserMembership.findAll({
        where: { documentId: doc1.id, userId: user2.id },
      });
      let doc2Memberships = await UserMembership.findAll({
        where: { documentId: doc2.id, userId: user2.id },
      });
      let doc3Memberships = await UserMembership.findAll({
        where: { documentId: doc3.id, userId: user2.id },
      });

      expect(doc1Memberships.length).toBe(1);
      expect(doc1Memberships[0].sourceId).toBe(rootMembership.id);
      expect(doc2Memberships.length).toBe(1);
      expect(doc2Memberships[0].sourceId).toBe(rootMembership.id);
      expect(doc3Memberships.length).toBe(1);
      expect(doc3Memberships[0].sourceId).toBe(rootMembership.id);

      // Remove user2's access to doc3 for security reasons
      await UserMembership.destroy({
        where: { documentId: doc3.id, userId: user2.id },
      });

      // Verify user2 no longer has access to doc3
      doc3Memberships = await UserMembership.findAll({
        where: { documentId: doc3.id, userId: user2.id },
      });
      expect(doc3Memberships.length).toBe(0);

      // Now move doc1 into doc2
      const processor = new DocumentMovedProcessor();
      await processor.perform({
        name: "documents.move",
        documentId: doc1.id,
        collectionId: collection.id,
        teamId: team.id,
        actorId: user.id,
        ip,
      });

      // Check that doc3 STILL does not have user2's permission
      // (Bug: it gets re-added because parent permissions are reapplied)
      doc3Memberships = await UserMembership.findAll({
        where: { documentId: doc3.id, userId: user2.id },
      });
      expect(doc3Memberships.length).toBe(0);

      // Check that doc1 and doc2 don't have duplicate permissions
      doc1Memberships = await UserMembership.findAll({
        where: { documentId: doc1.id, userId: user2.id },
      });
      doc2Memberships = await UserMembership.findAll({
        where: { documentId: doc2.id, userId: user2.id },
      });

      // Should only have 1 membership each (not duplicates)
      expect(doc1Memberships.length).toBe(1);
      expect(doc2Memberships.length).toBe(1);
    });

    it("should not create duplicate permissions when moving within same parent", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const user2 = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        userId: user.id,
        teamId: team.id,
      });

      // Create root document
      const rootDocument = await buildDocument({
        userId: user.id,
        collectionId: collection.id,
        teamId: team.id,
        title: "Root Document",
      });

      // Create child document
      const childDoc = await buildDocument({
        userId: user.id,
        collectionId: collection.id,
        teamId: team.id,
        title: "Child Document",
        parentDocumentId: rootDocument.id,
      });

      // Add user2 permission to root document
      await UserMembership.create({
        userId: user2.id,
        documentId: rootDocument.id,
        permission: DocumentPermission.ReadWrite,
        createdById: user.id,
      });

      // Get initial count
      let childMemberships = await UserMembership.findAll({
        where: { documentId: childDoc.id, userId: user2.id },
      });
      expect(childMemberships.length).toBe(1);

      // Move child document (reorder within same parent)
      const processor = new DocumentMovedProcessor();
      await processor.perform({
        name: "documents.move",
        documentId: childDoc.id,
        collectionId: collection.id,
        teamId: team.id,
        actorId: user.id,
        ip,
      });

      // Check that we still only have 1 membership (no duplicates)
      childMemberships = await UserMembership.findAll({
        where: { documentId: childDoc.id, userId: user2.id },
      });
      expect(childMemberships.length).toBe(1);
    });
  });
});
