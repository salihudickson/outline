import { Op } from "sequelize";
import { NotificationEventType, DocumentPermission } from "@shared/types";
import Logger from "@server/logging/Logger";
import {
  Document,
  Notification,
  User,
  UserMembership,
  GroupMembership,
  Group,
  GroupUser,
  Collection,
} from "@server/models";
import { DocumentAccessRequestEvent } from "@server/types";
import { BaseTask, TaskPriority } from "./base/BaseTask";

/**
 * Notification task that sends notifications to users who can manage a document
 * when someone requests access to it.
 */
export default class DocumentAccessRequestedNotificationsTask extends BaseTask<DocumentAccessRequestEvent> {
  public async perform(event: DocumentAccessRequestEvent) {
    const document = await Document.findByPk(event.documentId);
    if (!document) {
      Logger.debug(
        "task",
        `Document not found for access request notification`,
        {
          documentId: event.documentId,
        }
      );
      return;
    }

    const requestingUser = await User.findByPk(event.data.userId);
    if (!requestingUser) {
      Logger.debug(
        "task",
        `Requesting user not found for access request notification`,
        {
          userId: event.data.userId,
        }
      );
      return;
    }

    // Find users who can manage the document
    const recipients = await this.findDocumentManagers(document);

    for (const recipient of recipients) {
      // Don't notify the user who made the request
      if (recipient.id === requestingUser.id) {
        continue;
      }

      // Check if user has notifications enabled for this event type
      if (
        recipient.isSuspended ||
        !recipient.subscribedToEventType(
          NotificationEventType.RequestAccessDocument
        )
      ) {
        continue;
      }

      // Create a notification for this recipient
      await Notification.create({
        event: NotificationEventType.RequestAccessDocument,
        userId: recipient.id,
        actorId: event.data.userId,
        teamId: event.teamId,
        documentId: event.documentId,
      });
    }
  }

  /**
   * Find all users who can manage the document (have admin/manage permissions).
   *
   * @param document - the document to find managers for.
   * @returns list of users who can manage the document.
   */
  private async findDocumentManagers(document: Document): Promise<User[]> {
    const managerIds = new Set<string>();

    // Check direct user memberships with admin permission
    const userMemberships = await UserMembership.findAll({
      where: {
        documentId: document.id,
        permission: DocumentPermission.Admin,
      },
    });
    userMemberships.forEach((m) => managerIds.add(m.userId));

    // Check group memberships with admin permission
    const groupMemberships = await GroupMembership.findAll({
      where: {
        documentId: document.id,
        permission: DocumentPermission.Admin,
      },
      include: [
        {
          model: Group,
          as: "group",
          required: true,
          include: [
            {
              model: GroupUser,
              as: "groupUsers",
              required: true,
            },
          ],
        },
      ],
    });

    for (const gm of groupMemberships) {
      if (gm.group?.groupUsers) {
        gm.group.groupUsers.forEach((gu) => managerIds.add(gu.userId));
      }
    }

    // If the document belongs to a collection, check collection admins
    if (document.collectionId) {
      const collection = await Collection.findByPk(document.collectionId);
      if (collection) {
        // Check collection user memberships with admin permission
        const collectionUserMemberships = await UserMembership.findAll({
          where: {
            collectionId: collection.id,
            permission: DocumentPermission.Admin,
          },
        });
        collectionUserMemberships.forEach((m) => managerIds.add(m.userId));

        // Check collection group memberships with admin permission
        const collectionGroupMemberships = await GroupMembership.findAll({
          where: {
            collectionId: collection.id,
            permission: DocumentPermission.Admin,
          },
          include: [
            {
              model: Group,
              as: "group",
              required: true,
              include: [
                {
                  model: GroupUser,
                  as: "groupUsers",
                  required: true,
                },
              ],
            },
          ],
        });

        for (const gm of collectionGroupMemberships) {
          if (gm.group?.groupUsers) {
            gm.group.groupUsers.forEach((gu) => managerIds.add(gu.userId));
          }
        }
      }
    }

    // Also include the document creator as someone who should be notified
    if (document.createdById) {
      managerIds.add(document.createdById);
    }

    // Fetch the actual user objects
    const users = await User.findAll({
      where: {
        id: {
          [Op.in]: Array.from(managerIds),
        },
        teamId: document.teamId,
      },
    });

    return users;
  }

  public get options() {
    return {
      priority: TaskPriority.Background,
    };
  }
}
