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
      documentId: {
        type: Sequelize.UUID,
        allowNull: false,
        onDelete: "cascade",
        references: {
          model: "documents",
        },
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        onDelete: "cascade",
        references: {
          model: "users",
        },
      },
      teamId: {
        type: Sequelize.UUID,
        allowNull: false,
        onDelete: "cascade",
        references: {
          model: "teams",
        },
      },
      requestedPermission: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "pending",
      },
      responderId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
        },
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

    await queryInterface.addIndex("access_requests", ["documentId", "userId"]);
    await queryInterface.addIndex("access_requests", ["userId"]);
    await queryInterface.addIndex("access_requests", ["status"]);
    await queryInterface.addIndex("access_requests", ["createdAt"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("access_requests");
  },
};
