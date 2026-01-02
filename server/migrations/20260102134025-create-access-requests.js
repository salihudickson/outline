"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("access_requests", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      status: {
        type: Sequelize.ENUM("pending", "approved", "dismissed"),
        allowNull: false,
        defaultValue: "pending",
      },
      resourceType: {
        type: Sequelize.ENUM("document", "collection"),
        allowNull: false,
      },
      documentId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "documents",
        },
        onDelete: "CASCADE",
      },
      collectionId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "collections",
        },
        onDelete: "CASCADE",
      },
      requestedById: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
        },
        onDelete: "CASCADE",
      },
      respondedById: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
        },
        onDelete: "SET NULL",
      },
      approvedPermission: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      teamId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "teams",
        },
        onDelete: "CASCADE",
      },
      respondedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex("access_requests", ["documentId"]);
    await queryInterface.addIndex("access_requests", ["collectionId"]);
    await queryInterface.addIndex("access_requests", ["requestedById"]);
    await queryInterface.addIndex("access_requests", ["teamId"]);
    await queryInterface.addIndex("access_requests", ["status"]);
    await queryInterface.addIndex("access_requests", [
      "requestedById",
      "documentId",
      "status",
    ], {
      name: "access_requests_user_document_status",
    });
    await queryInterface.addIndex("access_requests", [
      "requestedById",
      "collectionId",
      "status",
    ], {
      name: "access_requests_user_collection_status",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("access_requests");
  },
};
