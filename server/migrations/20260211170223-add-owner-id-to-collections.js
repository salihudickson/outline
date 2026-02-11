'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("collections", "ownerId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    });
    await queryInterface.addIndex("collections", ["ownerId"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("collections", ["ownerId"]);
    await queryInterface.removeColumn("collections", "ownerId");
  }
};
