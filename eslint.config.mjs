import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    { ignores: ['dist/**', 'node_modules/**', 'android/**', 'ios/**', 'example/**'] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    reactHooks.configs.flat.recommended,
    {
        files: ['src/**/*.{ts,tsx}', 'consumer/**/*.{ts,tsx}'],
        languageOptions: { globals: globals.browser },
    },
    {
        files: ['*.js', '*.mjs', '*.ts', 'bin/*.mjs', 'consumer/**/*.{mjs,cjs}'],
        languageOptions: { globals: globals.node },
    },
    {
        files: ['*.js', '**/*.cjs'],
        languageOptions: { sourceType: 'commonjs' },
        rules: { '@typescript-eslint/no-require-imports': 'off' },
    },
    {
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
        },
    },
);
