'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    
    // Get all active users
    const users = await queryInterface.sequelize.query(
      `SELECT id, "teamId", name FROM users WHERE "deletedAt" IS NULL`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Create a personal collection for each user
    for (const user of users) {
      // Check if user already has a personal collection
      const existingPersonalCollection = await queryInterface.sequelize.query(
        `SELECT id FROM collections WHERE "ownerId" = :userId AND "deletedAt" IS NULL LIMIT 1`,
        {
          replacements: { userId: user.id },
          type: Sequelize.QueryTypes.SELECT,
        }
      );

      if (existingPersonalCollection.length === 0) {
        // Use PostgreSQL to generate a unique urlId using substring of UUID
        await queryInterface.sequelize.query(
          `INSERT INTO collections 
           (id, "urlId", name, description, "teamId", "createdById", "ownerId", permission, sharing, sort, "createdAt", "updatedAt")
           VALUES 
           (uuid_generate_v4(), substring(replace(uuid_generate_v4()::text, '-', '') from 1 for 10), :name, :description, :teamId, :createdById, :ownerId, NULL, true, :sort, NOW(), NOW())`,
          {
            replacements: {
              name: 'Personal Notes',
              description: 'Your personal notes area. This collection is private to you.',
              teamId: user.teamId,
              createdById: user.id,
              ownerId: user.id,
              sort: JSON.stringify({ field: 'index', direction: 'asc' }),
            },
          }
        );
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove personal collections that match the pattern created by this migration
    // This is safer than removing all collections with ownerId
    await queryInterface.sequelize.query(
      `DELETE FROM collections WHERE "ownerId" IS NOT NULL AND name = 'Personal Notes'`
    );
  }
};
