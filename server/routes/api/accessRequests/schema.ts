import { z } from "zod";
import { DocumentPermission } from "@shared/types";
import { BaseSchema } from "@server/routes/api/schema";

const BaseIdSchema = z.object({
  /** Access Request Id */
  id: z.string().uuid(),
});

export const AccessRequestsApproveSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    /** Permission level to grant */
    permission: z.nativeEnum(DocumentPermission).optional(),
  }),
});

export type AccessRequestsApproveReq = z.infer<
  typeof AccessRequestsApproveSchema
>;

export const AccessRequestsDismissSchema = BaseSchema.extend({
  body: BaseIdSchema,
});

export type AccessRequestsDismissReq = z.infer<
  typeof AccessRequestsDismissSchema
>;
