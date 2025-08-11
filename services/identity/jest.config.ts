module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.db.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  collectCoverageFrom: [
    '<rootDir>/src/db/**/*.ts',
    '!<rootDir>/src/db/index.ts'
  ],
  coverageProvider: 'v8',
  coverageThreshold: {
    global: { statements: 100, branches: 100, lines: 100, functions: 0 },
  },
};