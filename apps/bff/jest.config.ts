export default {
  testEnvironment: 'node',
  transform: { '^.+\\.(t|j)sx?$': ['ts-jest', { tsconfig: true }] },
  moduleFileExtensions: ['ts', 'js'],
  testMatch: ['**/*.spec.ts'],
  setupFiles: ['<rootDir>/test/setup-e2e.ts'],
};