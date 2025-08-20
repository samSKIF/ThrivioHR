import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['app/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}', 'middleware.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.eslint.json',
        ecmaFeatures: { 
          jsx: true 
        }
      }
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-unused-vars': 'off',
      'no-undef': 'off'
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { 
          jsx: true 
        }
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'off'
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.spec.tsx', '__tests__/**/*', 'jest.setup.ts', 'jest.config.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { 
          jsx: true 
        }
      }
    },
    rules: { 
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-undef': 'off'
    }
  },
  {
    ignores: ['.next/', 'dist/', 'build/', 'node_modules/', 'static/', '__tests__/', 'coverage/']
  }
];