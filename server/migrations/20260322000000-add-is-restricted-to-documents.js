"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "documents",
        "isRestricted",
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        { transaction }
      );

      await queryInterface.addIndex("documents", ["isRestricted"], {
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex("documents", ["isRestricted"], {
        transaction,
      });

      await queryInterface.removeColumn("documents", "isRestricted", {
        transaction,
      });
    });
  },
};
