import { pathsToModuleNameMapper } from 'ts-jest';
import tsconfig from '../../tsconfig.base.json';

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleNameMapper: pathsToModuleNameMapper(
    (tsconfig as any).compilerOptions?.paths || {},
    { prefix: '<rootDir>/../../' }
  ),
};