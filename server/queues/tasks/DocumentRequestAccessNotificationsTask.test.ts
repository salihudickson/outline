import { DocumentPermission, NotificationEventType } from "@shared/types";
import { Notification, UserMembership } from "@server/models";
import {
  buildDocument,
  buildCollection,
  buildUser,
  buildTeam,
} from "@server/test/factories";
import DocumentRequestAccessNotificationsTask from "./DocumentRequestAccessNotificationsTask";

const ip = "127.0.0.1";

beforeEach(async () => {
  jest.resetAllMocks();
});

describe("DocumentRequestAccessNotificationsTask", () => {
  test("should not create notification if document does not exist", async () => {
    const spy = jest.spyOn(Notification, "create");
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });

    const task = new DocumentRequestAccessNotificationsTask();
    await task.perform({
      name: "documents.request_access",
      documentId: "non-existent-document-id",
      userId: user.id,
      teamId: team.id,
      actorId: user.id,
      ip,
    });

    expect(spy).not.toHaveBeenCalled();
  });

  test("should not create notification if requesting user does not exist", async () => {
    const spy = jest.spyOn(Notification, "create");
    const team = await buildTeam();
    const owner = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      createdById: owner.id,
      permission: null,
    });
    const document = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
      createdById: owner.id,
    });

    const task = new DocumentRequestAccessNotificationsTask();
    await task.perform({
      name: "documents.request_access",
      documentId: document.id,
      userId: "non-existent-user-id",
      teamId: team.id,
      actorId: "non-existent-user-id",
      ip,
    });

    expect(spy).not.toHaveBeenCalled();
  });

  test("should send notification to document admin", async () => {
    const spy = jest.spyOn(Notification, "create");
    const team = await buildTeam();
    const admin = await buildUser({ teamId: team.id });
    const requester = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      createdById: admin.id,
      permission: null,
    });
    const document = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
      createdById: admin.id,
    });

    // Add admin as document admin
    await UserMembership.create({
      userId: admin.id,
      documentId: document.id,
      permission: DocumentPermission.Admin,
      createdById: admin.id,
    });

    // Enable notifications for the admin
    admin.setNotificationEventType(NotificationEventType.RequestDocumentAccess);
    await admin.save();

    const task = new DocumentRequestAccessNotificationsTask();
    await task.perform({
      name: "documents.request_access",
      documentId: document.id,
      userId: requester.id,
      teamId: team.id,
      actorId: requester.id,
      ip,
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: NotificationEventType.RequestDocumentAccess,
        userId: admin.id,
        actorId: requester.id,
        documentId: document.id,
        teamId: team.id,
      })
    );
  });

  test("should not send notification to the requesting user themselves", async () => {
    const spy = jest.spyOn(Notification, "create");
    const team = await buildTeam();
    const admin = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      createdById: admin.id,
      permission: null,
    });
    const document = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
      createdById: admin.id,
    });

    // Add admin as document admin
    await UserMembership.create({
      userId: admin.id,
      documentId: document.id,
      permission: DocumentPermission.Admin,
      createdById: admin.id,
    });

    // Enable notifications for the admin
    admin.setNotificationEventType(NotificationEventType.RequestDocumentAccess);
    await admin.save();

    // Admin requests access to their own document (edge case)
    const task = new DocumentRequestAccessNotificationsTask();
    await task.perform({
      name: "documents.request_access",
      documentId: document.id,
      userId: admin.id,
      teamId: team.id,
      actorId: admin.id,
      ip,
    });

    expect(spy).not.toHaveBeenCalled();
  });

  test("should not send notification to suspended users", async () => {
    const spy = jest.spyOn(Notification, "create");
    const team = await buildTeam();
    const admin = await buildUser({ teamId: team.id, suspendedAt: new Date() });
    const requester = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      createdById: admin.id,
      permission: null,
    });
    const document = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
      createdById: admin.id,
    });

    // Add admin as document admin
    await UserMembership.create({
      userId: admin.id,
      documentId: document.id,
      permission: DocumentPermission.Admin,
      createdById: admin.id,
    });

    const task = new DocumentRequestAccessNotificationsTask();
    await task.perform({
      name: "documents.request_access",
      documentId: document.id,
      userId: requester.id,
      teamId: team.id,
      actorId: requester.id,
      ip,
    });

    expect(spy).not.toHaveBeenCalled();
  });

  test("should not send notification if user has disabled this notification type", async () => {
    const spy = jest.spyOn(Notification, "create");
    const team = await buildTeam();
    const admin = await buildUser({ teamId: team.id });
    const requester = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      createdById: admin.id,
      permission: null,
    });
    const document = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
      createdById: admin.id,
    });

    // Add admin as document admin
    await UserMembership.create({
      userId: admin.id,
      documentId: document.id,
      permission: DocumentPermission.Admin,
      createdById: admin.id,
    });

    // Explicitly disable notifications for this event type
    admin.setNotificationEventType(
      NotificationEventType.RequestDocumentAccess,
      false
    );
    await admin.save();

    const task = new DocumentRequestAccessNotificationsTask();
    await task.perform({
      name: "documents.request_access",
      documentId: document.id,
      userId: requester.id,
      teamId: team.id,
      actorId: requester.id,
      ip,
    });

    expect(spy).not.toHaveBeenCalled();
  });
});
