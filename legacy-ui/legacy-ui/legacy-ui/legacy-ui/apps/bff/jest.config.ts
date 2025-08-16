export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  // Avoid importing tsconfig.base.json; hard-map the known alias(es) instead
  moduleNameMapper: {
    '^@thrivio/contracts(.*)$': '<rootDir>/../../packages/contracts/src$1',
  },
};