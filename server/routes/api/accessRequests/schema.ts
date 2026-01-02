import isEmpty from "lodash/isEmpty";
import { z } from "zod";
import { CollectionPermission, DocumentPermission } from "@shared/types";
import { zodIdType } from "@server/utils/zod";
import { BaseSchema } from "../schema";

export const AccessRequestsCreateSchema = BaseSchema.extend({
  body: z
    .object({
      documentId: zodIdType().optional(),
      collectionId: zodIdType().optional(),
    })
    .refine(
      (obj) => !(isEmpty(obj.documentId) && isEmpty(obj.collectionId)),
      {
        message: "one of documentId or collectionId is required",
      }
    )
    .refine(
      (obj) => isEmpty(obj.documentId) || isEmpty(obj.collectionId),
      {
        message: "only one of documentId or collectionId can be provided",
      }
    ),
});

export type AccessRequestsCreateReq = z.infer<
  typeof AccessRequestsCreateSchema
>;

export const AccessRequestsApproveSchema = BaseSchema.extend({
  body: z.object({
    id: z.string().uuid(),
    permission: z.enum([
      CollectionPermission.Read,
      CollectionPermission.ReadWrite,
      CollectionPermission.Admin,
      DocumentPermission.Read,
      DocumentPermission.ReadWrite,
      DocumentPermission.Admin,
    ]),
  }),
});

export type AccessRequestsApproveReq = z.infer<
  typeof AccessRequestsApproveSchema
>;

export const AccessRequestsDismissSchema = BaseSchema.extend({
  body: z.object({
    id: z.string().uuid(),
  }),
});

export type AccessRequestsDismissReq = z.infer<
  typeof AccessRequestsDismissSchema
>;

export const AccessRequestsListSchema = BaseSchema.extend({
  body: z.object({
    status: z.enum(["pending", "approved", "dismissed"]).optional(),
  }),
});

export type AccessRequestsListReq = z.infer<typeof AccessRequestsListSchema>;
