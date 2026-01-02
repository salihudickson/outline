"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "access_requests",
        {
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
        },
        { transaction }
      );

      await queryInterface.addIndex(
        "access_requests",
        ["documentId", "userId"],
        { transaction }
      );
      await queryInterface.addIndex("access_requests", ["userId"], {
        transaction,
      });
      await queryInterface.addIndex("access_requests", ["status"], {
        transaction,
      });
      await queryInterface.addIndex("access_requests", ["createdAt"], {
        transaction,
      });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex(
        "access_requests",
        ["documentId", "userId"],
        { transaction }
      );
      await queryInterface.removeIndex("access_requests", ["userId"], {
        transaction,
      });
      await queryInterface.removeIndex("access_requests", ["status"], {
        transaction,
      });
      await queryInterface.removeIndex("access_requests", ["createdAt"], {
        transaction,
      });
      await queryInterface.dropTable("access_requests", { transaction });
    });
  },
};
