import nextJest from 'next/jest';
import type { Config } from 'jest';

const createJestConfig = nextJest({ dir: __dirname });

const config: Config = {
  testEnvironment: 'jsdom',
  // Precisely target only the authLink spec
  testMatch: ['<rootDir>/lib/apollo/authLink.spec.{ts,tsx}'],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/__tests__/',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  maxWorkers: 1,
  testTimeout: 30000,
  // Note: verbose can be removed later for cleaner CI output
  verbose: true,
};

export default createJestConfig(config);