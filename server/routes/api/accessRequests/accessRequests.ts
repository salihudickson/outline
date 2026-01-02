import Router from "koa-router";
import { WhereOptions } from "sequelize";
import { NotificationEventType } from "@shared/types";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import {
  AccessRequest,
  Collection,
  Document,
  Notification,
  UserMembership,
} from "@server/models";
import {
  AccessRequestResourceType,
  AccessRequestStatus,
} from "@server/models/AccessRequest";
import { authorize } from "@server/policies";
import { presentPolicies } from "@server/presenters";
import { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "accessRequests.create",
  rateLimiter(RateLimiterStrategy.TenPerHour),
  auth(),
  validate(T.AccessRequestsCreateSchema),
  transaction(),
  async (ctx: APIContext<T.AccessRequestsCreateReq>) => {
    const { documentId, collectionId } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    // Determine resource type and validate resource exists
    let document: Document | null = null;
    let resourceType: AccessRequestResourceType;
    let recipientUserIds: string[] = [];

    if (documentId) {
      document = await Document.findByPk(documentId, {
        transaction,
        rejectOnEmpty: true,
      });
      resourceType = AccessRequestResourceType.Document;

      // Get document admins to notify
      const memberships = await UserMembership.findAll({
        where: {
          documentId,
          permission: "admin",
        },
        transaction,
      });
      recipientUserIds = memberships.map((m) => m.userId);

      // Also add collection admins if document is in a collection
      if (document.collectionId) {
        const collectionMemberships = await UserMembership.findAll({
          where: {
            collectionId: document.collectionId,
            permission: "admin",
          },
          transaction,
        });
        recipientUserIds.push(...collectionMemberships.map((m) => m.userId));
      }
    } else if (collectionId) {
      // Validate collection exists
      await Collection.findByPk(collectionId, {
        transaction,
        rejectOnEmpty: true,
      });
      resourceType = AccessRequestResourceType.Collection;

      // Get collection admins to notify
      const memberships = await UserMembership.findAll({
        where: {
          collectionId,
          permission: "admin",
        },
        transaction,
      });
      recipientUserIds = memberships.map((m) => m.userId);
    } else {
      throw new Error("Either documentId or collectionId must be provided");
    }

    // Remove duplicates and the requesting user
    recipientUserIds = [...new Set(recipientUserIds)].filter(
      (id) => id !== user.id
    );

    // Check for existing pending request
    const hasPending = await AccessRequest.hasPendingRequest({
      userId: user.id,
      documentId: documentId ?? null,
      collectionId: collectionId ?? null,
    });

    if (hasPending) {
      ctx.body = {
        success: false,
        message: "A pending access request already exists for this resource",
      };
      return;
    }

    // Create the access request
    const accessRequest = await AccessRequest.create(
      {
        requestedById: user.id,
        documentId: documentId ?? null,
        collectionId: collectionId ?? null,
        resourceType,
        teamId: user.teamId,
        status: AccessRequestStatus.Pending,
      },
      { transaction }
    );

    // Create notifications for admins
    if (recipientUserIds.length > 0) {
      await Promise.all(
        recipientUserIds.map((recipientId) =>
          Notification.create(
            {
              event: NotificationEventType.RequestAccess,
              userId: recipientId,
              actorId: user.id,
              teamId: user.teamId,
              documentId: documentId ?? null,
              collectionId: collectionId ?? null,
              data: {
                accessRequestId: accessRequest.id,
              },
            },
            { transaction }
          )
        )
      );
    }

    ctx.body = {
      success: true,
      data: {
        id: accessRequest.id,
        status: accessRequest.status,
      },
    };
  }
);

router.post(
  "accessRequests.approve",
  auth(),
  validate(T.AccessRequestsApproveSchema),
  transaction(),
  async (ctx: APIContext<T.AccessRequestsApproveReq>) => {
    const { id, permission } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const accessRequest = await AccessRequest.findByPk(id, {
      include: [
        {
          association: "requestedBy",
          required: true,
        },
        {
          association: "document",
          required: false,
        },
        {
          association: "collection",
          required: false,
        },
      ],
      transaction,
      rejectOnEmpty: true,
      lock: transaction.LOCK.UPDATE,
    });

    // Check if user can approve - must be admin of the resource
    if (accessRequest.documentId) {
      const document = await Document.findByPk(accessRequest.documentId, {
        userId: user.id,
        transaction,
      });
      authorize(user, "share", document);
    } else if (accessRequest.collectionId) {
      const collection = await Collection.findByPk(accessRequest.collectionId, {
        userId: user.id,
        transaction,
      });
      authorize(user, "update", collection);
    }

    // Update access request
    accessRequest.status = AccessRequestStatus.Approved;
    accessRequest.respondedById = user.id;
    accessRequest.respondedAt = new Date();
    accessRequest.approvedPermission = permission;
    await accessRequest.saveWithCtx(ctx);

    // Grant the permission
    await UserMembership.create(
      {
        userId: accessRequest.requestedById,
        documentId: accessRequest.documentId,
        collectionId: accessRequest.collectionId,
        permission,
        createdById: user.id,
      },
      { transaction }
    );

    // Mark related notifications as read
    await Notification.update(
      { viewedAt: new Date() },
      {
        where: {
          event: NotificationEventType.RequestAccess,
          data: {
            accessRequestId: id,
          },
        },
        transaction,
      }
    );

    ctx.body = {
      success: true,
      data: {
        id: accessRequest.id,
        status: accessRequest.status,
        approvedPermission: accessRequest.approvedPermission,
      },
      policies: presentPolicies(user, [accessRequest]),
    };
  }
);

router.post(
  "accessRequests.dismiss",
  auth(),
  validate(T.AccessRequestsDismissSchema),
  transaction(),
  async (ctx: APIContext<T.AccessRequestsDismissReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const accessRequest = await AccessRequest.findByPk(id, {
      transaction,
      rejectOnEmpty: true,
      lock: transaction.LOCK.UPDATE,
    });

    // Check if user can dismiss - must be admin of the resource
    if (accessRequest.documentId) {
      const document = await Document.findByPk(accessRequest.documentId, {
        userId: user.id,
        transaction,
      });
      authorize(user, "share", document);
    } else if (accessRequest.collectionId) {
      const collection = await Collection.findByPk(accessRequest.collectionId, {
        userId: user.id,
        transaction,
      });
      authorize(user, "update", collection);
    }

    // Update access request
    accessRequest.status = AccessRequestStatus.Dismissed;
    accessRequest.respondedById = user.id;
    accessRequest.respondedAt = new Date();
    await accessRequest.saveWithCtx(ctx);

    // Mark related notifications as read
    await Notification.update(
      { viewedAt: new Date() },
      {
        where: {
          event: NotificationEventType.RequestAccess,
          data: {
            accessRequestId: id,
          },
        },
        transaction,
      }
    );

    ctx.body = {
      success: true,
      data: {
        id: accessRequest.id,
        status: accessRequest.status,
      },
      policies: presentPolicies(user, [accessRequest]),
    };
  }
);

router.post(
  "accessRequests.list",
  auth(),
  pagination(),
  validate(T.AccessRequestsListSchema),
  async (ctx: APIContext<T.AccessRequestsListReq>) => {
    const { status } = ctx.input.body;
    const { user } = ctx.state.auth;

    const where: WhereOptions<AccessRequest> = {
      teamId: user.teamId,
    };

    if (status) {
      where.status = status;
    }

    const accessRequests = await AccessRequest.findAll({
      where,
      include: [
        {
          association: "requestedBy",
          required: true,
        },
        {
          association: "respondedBy",
          required: false,
        },
        {
          association: "document",
          required: false,
        },
        {
          association: "collection",
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
    });

    const total = await AccessRequest.count({ where });

    ctx.body = {
      pagination: { ...ctx.state.pagination, total },
      data: accessRequests,
      policies: presentPolicies(user, accessRequests),
    };
  }
);

export default router;
