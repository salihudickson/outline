import type {
  InferAttributes,
  InferCreationAttributes,
  SaveOptions,
} from "sequelize";
import {
  Table,
  ForeignKey,
  Column,
  PrimaryKey,
  IsUUID,
  CreatedAt,
  UpdatedAt,
  BelongsTo,
  DataType,
  Default,
  AllowNull,
  DefaultScope,
  AfterCreate,
} from "sequelize-typescript";
import { DocumentPermission } from "@shared/types";
import Model from "@server/models/base/Model";
import Document from "./Document";
import Event from "./Event";
import Team from "./Team";
import User from "./User";
import Fix from "./decorators/Fix";

export enum AccessRequestStatus {
  Pending = "pending",
  Approved = "approved",
  Dismissed = "dismissed",
}

@DefaultScope(() => ({
  include: [
    {
      association: "user",
      required: true,
    },
    {
      association: "document",
      required: true,
    },
    {
      association: "responder",
      required: false,
    },
  ],
}))
@Table({
  tableName: "access_requests",
  modelName: "access_request",
})
@Fix
class AccessRequest extends Model<
  InferAttributes<AccessRequest>,
  Partial<InferCreationAttributes<AccessRequest>>
> {
  @IsUUID(4)
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  /**
   * The permission level requested by the user. This field is optional
   * because users may request access without specifying a permission level,
   * leaving it to the document manager to decide.
   */
  @AllowNull
  @Column(DataType.STRING)
  requestedPermission: DocumentPermission | null;

  @Default(AccessRequestStatus.Pending)
  @Column(DataType.STRING)
  status: AccessRequestStatus;

  @AllowNull
  @Column
  respondedAt: Date | null;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  // associations

  @BelongsTo(() => Document, "documentId")
  document: Document;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string;

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  @BelongsTo(() => User, "responderId")
  responder: User | null;

  @AllowNull
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  responderId: string | null;

  @AfterCreate
  static async createEvent(
    model: AccessRequest,
    options: SaveOptions<InferAttributes<AccessRequest>>
  ) {
    const params = {
      name: "access_requests.create" as const,
      userId: model.userId,
      modelId: model.id,
      teamId: model.teamId,
      documentId: model.documentId,
    };

    if (options.transaction) {
      options.transaction.afterCommit(() => void Event.schedule(params));
      return;
    }
    await Event.schedule(params);
  }

  /**
   * Check if the user has already requested access to this document.
   *
   * @param documentId The document ID.
   * @param userId The user ID.
   * @returns True if there's a pending request.
   */
  public static async hasPendingRequest(
    documentId: string,
    userId: string
  ): Promise<boolean> {
    const count = await this.count({
      where: {
        documentId,
        userId,
        status: AccessRequestStatus.Pending,
      },
    });
    return count > 0;
  }
}

export default AccessRequest;
