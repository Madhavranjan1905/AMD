const pool = require('./config/database');
const { initializeDatabase } = require('./config/database-init');

const setupDatabase = async () => {
  try {
    console.log('Initializing database...');
    await initializeDatabase();
    console.log('Database initialization complete');
    await pool.end();
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
};

setupDatabase();
