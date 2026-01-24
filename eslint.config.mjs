import { defineConfig, globalIgnores } from "eslint/config";
import stylistic from "@stylistic/eslint-plugin";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([
    globalIgnores(["**/node_modules/", "**/dist/", "**/.next/", "src/assets", "**/*.config.js", "**/*.config.mjs", "**/next-env.d.ts", "**/public/sw.js"]),
    {
        extends: [
            ...compat.extends("eslint:recommended"),
            ...compat.extends("plugin:@typescript-eslint/recommended"),
            ...compat.extends("plugin:react/recommended"),
            ...compat.extends("next/core-web-vitals"),
            ...compat.extends("prettier")
        ],

        plugins: {
            "@stylistic": stylistic,
            "@typescript-eslint": typescriptEslint,
            react,
            "react-hooks": reactHooks,
        },

        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },

            parser: tsParser,
            ecmaVersion: "latest",
            sourceType: "module",
        },

    settings: {
        react: {
            version: "detect",
        },
    },

    rules: {
        ...reactHooks.configs.recommended.rules,

        "@typescript-eslint/no-unused-vars": ["warn", {
            varsIgnorePattern: "^_",
            args: "none",
        }],

        "@typescript-eslint/no-explicit-any": "off",
        "react/prop-types": "off",

        "@stylistic/max-len": ["error", {
            code: 120,
            ignoreUrls: true,
            ignoreStrings: true,
            ignoreTemplateLiterals: true,
        }],

    },
}]);
