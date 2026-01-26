import type { Transaction } from "sequelize";
import { Document, GroupMembership, UserMembership } from "@server/models";
import { sequelize } from "@server/storage/database";
import type { DocumentMovedEvent, Event } from "@server/types";
import BaseProcessor from "./BaseProcessor";

export default class DocumentMovedProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = ["documents.move"];

  async perform(event: DocumentMovedEvent) {
    await sequelize.transaction(async (transaction) => {
      const document = await Document.findByPk(event.documentId, {
        transaction,
      });
      if (!document) {
        return;
      }

      // Only recalculate memberships that are directly on the moved document (root memberships
      // where sourceId is null). We should not recalculate inherited memberships (sourced from
      // parent documents) as that would reapply parent permissions to all sibling documents,
      // including those that had permissions explicitly removed.
      const [userMemberships, groupMemberships] = await Promise.all([
        UserMembership.findAll({
          where: {
            documentId: document.id,
            sourceId: null,
          },
          transaction,
        }),
        GroupMembership.findAll({
          where: {
            documentId: document.id,
            sourceId: null,
          },
          transaction,
        }),
      ]);

      await this.recalculateUserMemberships(userMemberships, transaction);
      await this.recalculateGroupMemberships(groupMemberships, transaction);
    });
  }

  private async recalculateUserMemberships(
    memberships: UserMembership[],
    transaction?: Transaction
  ) {
    await Promise.all(
      memberships.map((membership) =>
        UserMembership.createSourcedMemberships(membership, {
          transaction,
        })
      )
    );
  }

  private async recalculateGroupMemberships(
    memberships: GroupMembership[],
    transaction?: Transaction
  ) {
    await Promise.all(
      memberships.map((membership) =>
        GroupMembership.createSourcedMemberships(membership, {
          transaction,
        })
      )
    );
  }
}
