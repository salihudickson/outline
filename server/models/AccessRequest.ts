import {
  InferAttributes,
  InferCreationAttributes,
  type SaveOptions,
  WhereOptions,
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
  IsIn,
  AfterCreate,
} from "sequelize-typescript";
import { CollectionPermission, DocumentPermission } from "@shared/types";
import Model from "@server/models/base/Model";
import Collection from "./Collection";
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

export enum AccessRequestResourceType {
  Document = "document",
  Collection = "collection",
}

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

  @Default(AccessRequestStatus.Pending)
  @IsIn([Object.values(AccessRequestStatus)])
  @Column(DataType.ENUM(...Object.values(AccessRequestStatus)))
  status: AccessRequestStatus;

  @IsIn([Object.values(AccessRequestResourceType)])
  @Column(DataType.ENUM(...Object.values(AccessRequestResourceType)))
  resourceType: AccessRequestResourceType;

  @AllowNull
  @Column(DataType.STRING)
  approvedPermission: CollectionPermission | DocumentPermission | null;

  @AllowNull
  @Column
  respondedAt: Date | null;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  // associations

  @BelongsTo(() => Document, "documentId")
  document?: Document;

  @AllowNull
  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string | null;

  @BelongsTo(() => Collection, "collectionId")
  collection?: Collection;

  @AllowNull
  @ForeignKey(() => Collection)
  @Column(DataType.UUID)
  collectionId: string | null;

  @BelongsTo(() => User, "requestedById")
  requestedBy: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  requestedById: string;

  @BelongsTo(() => User, "respondedById")
  respondedBy?: User;

  @AllowNull
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  respondedById: string | null;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  @AfterCreate
  static async createEvent(
    model: AccessRequest,
    options: SaveOptions<InferAttributes<AccessRequest>>
  ) {
    const params = {
      name: "access_requests.create",
      userId: model.requestedById,
      modelId: model.id,
      teamId: model.teamId,
      documentId: model.documentId,
      collectionId: model.collectionId,
    };

    if (options.transaction) {
      options.transaction.afterCommit(() => void Event.schedule(params));
      return;
    }
    await Event.schedule(params);
  }

  /**
   * Checks if a pending request already exists for this resource and user.
   *
   * @param userId - The ID of the user requesting access.
   * @param documentId - The ID of the document (if requesting document access).
   * @param collectionId - The ID of the collection (if requesting collection access).
   * @returns True if a pending request exists, false otherwise.
   */
  static async hasPendingRequest({
    userId,
    documentId,
    collectionId,
  }: {
    userId: string;
    documentId?: string | null;
    collectionId?: string | null;
  }): Promise<boolean> {
    const where: WhereOptions<AccessRequest> = {
      requestedById: userId,
      status: AccessRequestStatus.Pending,
    };

    if (documentId) {
      where.documentId = documentId;
    }
    if (collectionId) {
      where.collectionId = collectionId;
    }

    const count = await this.count({ where });
    return count > 0;
  }
}

export default AccessRequest;
