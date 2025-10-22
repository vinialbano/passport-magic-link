import eslint from '@eslint/js'
import jest from 'eslint-plugin-jest'
import nodePlugin from 'eslint-plugin-n'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

export default defineConfig(
  {
    ignores: ['lib/**/*', 'coverage/**/*', 'node_modules/**/*']
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  nodePlugin.configs['flat/recommended-script'],
  {
    files: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
    ...jest.configs['flat/recommended']
  },
  {
    files: ['index.js'],
    rules: {
      'n/no-unpublished-import': 'off'
    }
  }
)
