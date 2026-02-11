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
        // Generate a unique urlId (10 characters)
        const urlId = Math.random().toString(36).substring(2, 12);
        
        await queryInterface.sequelize.query(
          `INSERT INTO collections 
           (id, "urlId", name, description, "teamId", "createdById", "ownerId", permission, sharing, sort, "createdAt", "updatedAt")
           VALUES 
           (uuid_generate_v4(), :urlId, :name, :description, :teamId, :createdById, :ownerId, NULL, true, :sort, NOW(), NOW())`,
          {
            replacements: {
              urlId,
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
    // Remove all personal collections
    await queryInterface.sequelize.query(
      `DELETE FROM collections WHERE "ownerId" IS NOT NULL`
    );
  }
};
