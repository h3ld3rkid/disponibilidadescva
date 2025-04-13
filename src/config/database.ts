
// Database configuration
export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

// Default configuration
export const defaultDatabaseConfig: DatabaseConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'cruz_vermelha_amares'
};

// Get the current database configuration from localStorage or use default
export const getDatabaseConfig = (): DatabaseConfig => {
  const storedConfig = localStorage.getItem('databaseConfig');
  if (storedConfig) {
    try {
      return JSON.parse(storedConfig);
    } catch (error) {
      console.error('Error parsing database config:', error);
      return defaultDatabaseConfig;
    }
  }
  return defaultDatabaseConfig;
};

// Save database configuration to localStorage
export const saveDatabaseConfig = (config: DatabaseConfig): void => {
  localStorage.setItem('databaseConfig', JSON.stringify(config));
};
