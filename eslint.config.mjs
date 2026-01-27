// ============================================================================
// ESLint Flat Config for cordova-simulate (ESLint v9+)
// ----------------------------------------------------------------------------
// This repository uses ESLint "flat config". ESLint recognizes configuration
// files named eslint.config.js / eslint.config.mjs / eslint.config.cjs placed
// at the project root and expects them to export an array of config objects. [1](https://eslint.org/docs/latest/use/configure/configuration-files)
//
// Summary (what this config is designed to accomplish):
// 0) Centralize ignore patterns previously maintained via .eslintignore.
// 1) Start from ESLint's recommended rule set as a baseline.
// 2) Lint a CommonJS-oriented codebase (require/module.exports) using modern
//    JavaScript syntax support (ecmaVersion: "latest").
// 3) Declare globals via configuration (flat config does not rely on "env").
// 4) Apply directory-specific policies (app-host/platforms/plugins/server/tests/tools).
// 5) Keep rule relaxations narrow and localized (file-scoped exceptions only).
//
// Notes:
// - Language options in flat config are controlled via languageOptions, including
//   ecmaVersion, sourceType, and globals. [2](https://eslint.org/docs/latest/use/configure/language-options)
// - This file intentionally avoids custom parsers to keep configuration
//   introspection and tooling predictable.
// ============================================================================

import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import js from "@eslint/js";

export default defineConfig([
    // ==========================================================================
    // 0) Global ignores (legacy .eslintignore intent)
    // --------------------------------------------------------------------------
    // These patterns prevent ESLint from scanning vendor or generated assets.
    // ==========================================================================

    globalIgnores([
        "src/third-party/**/*.js",
        "test/resources/**",

        // Known vendor plugin JS files from the legacy ignore list
        "src/plugins/cordova-plugin-geolocation/OpenLayers.js",
        "src/plugins/cordova-plugin-device-motion/3d.js",
        "src/plugins/cordova-plugin-device-motion/draw.js",
        "src/plugins/cordova-plugin-globalization/accounting.js",
        "src/plugins/cordova-plugin-globalization/moment.js",
    ]),

    // ==========================================================================
    // 1) Baseline recommended rules
    // --------------------------------------------------------------------------
    // Flat-config friendly equivalent of legacy "extends: eslint:recommended".
    // ==========================================================================

    js.configs.recommended,

    // ==========================================================================
    // 2) Base repository rules (all *.js)
    // --------------------------------------------------------------------------
    // - ecmaVersion: "latest" supports modern syntax (e.g., const/let).
    // - sourceType: "commonjs" aligns with require/module.exports usage.
    // - globals: broad defaults (browser + node + commonjs), plus repo-specific
    //   globals observed in runtime code paths.
    // ==========================================================================

    {
        name: "base-js",
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "commonjs",
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.commonjs,

                // --------------------------------------------------------------------
                // Repo-specific globals used by existing code paths
                // --------------------------------------------------------------------
                openDatabase: "readonly",
                validateArgumentType: "readonly",
                updatePositionInfo: "readonly",

                // --------------------------------------------------------------------
                // Common runtime globals referenced across the project
                // --------------------------------------------------------------------
                io: "readonly",
                Windows: "readonly",
                Media: "readonly",
                ThreeDee: "readonly",
                Draw: "readonly",
                CordovaLabeledValue: "readonly",
                CordovaItem: "readonly",
            },
        },
        rules: {
            // --------------------------------------------------------------------
            // Style and consistency rules migrated from the legacy root configuration
            // --------------------------------------------------------------------
            quotes: [2, "single", { avoidEscape: false, allowTemplateLiterals: true }],
            "no-console": 0,
            indent: ["error", 4, { SwitchCase: 1, VariableDeclarator: 1 }],
            "no-useless-escape": "off",
            semi: ["error", "always"],
            "space-infix-ops": ["error", { int32Hint: false }],
            "comma-spacing": ["error", { before: false, after: true }],
            "key-spacing": ["error", { beforeColon: false, afterColon: true }],
            "no-prototype-builtins": "off",
            "no-redeclare": ["error", { builtinGlobals: false }],

            // --------------------------------------------------------------------
            // Undefined identifiers policy
            // --------------------------------------------------------------------
            // Kept as "warn" to preserve the current low-noise workflow while allowing
            // gradual cleanup where needed.
            "no-undef": "warn",

            // --------------------------------------------------------------------
            // Unused variables policy
            // --------------------------------------------------------------------
            // - Ignore unused function parameters (common in legacy callbacks)
            // - Ignore unused catch parameters
            // - Allow a small set of common error variable names without code changes
            "no-unused-vars": [
                "error",
                {
                    args: "none",
                    caughtErrors: "none",
                    varsIgnorePattern: "^(ex|err|e|error)$",
                },
            ],
        },
    },

    // ==========================================================================
    // 3) app-host override
    // --------------------------------------------------------------------------
    // Directory policy: console usage is treated as an error for app-host code.
    // ==========================================================================

    {
        name: "app-host",
        files: ["src/app-host/**/*.js"],
        rules: {
            "no-console": "error",
        },
    },

    // ==========================================================================
    // 4) platforms override
    // --------------------------------------------------------------------------
    // Directory policy: keep unused-parameter behavior consistent with legacy intent.
    // ==========================================================================

    {
        name: "platforms",
        files: ["src/platforms/**/*.js"],
        rules: {
            "no-unused-vars": [
                "error",
                {
                    args: "none",
                    caughtErrors: "none",
                    varsIgnorePattern: "^(ex|err|e|error)$",
                },
            ],
        },
    },

    // ==========================================================================
    // 5) plugins override
    // --------------------------------------------------------------------------
    // Plugins frequently rely on Cordova-related globals. Declare them here to
    // reduce false positives in plugin code.
    // ==========================================================================

    {
        name: "plugins",
        files: ["src/plugins/**/*.js"],
        languageOptions: {
            globals: {
                cordova: "readonly",
                device: "readonly",
                OpenLayers: "readonly",
                Media: "readonly",
                ThreeDee: "readonly",
                Draw: "readonly",
                CordovaLabeledValue: "readonly",
                CordovaItem: "readonly",
            },
        },
        rules: {
            // Kept disabled due to legacy plugin patterns in this repository
            "no-constant-binary-expression": "off",

            "no-unused-vars": [
                "error",
                {
                    args: "none",
                    caughtErrors: "none",
                    varsIgnorePattern: "^(ex|err|e|error)$",
                },
            ],
        },
    },

    // ==========================================================================
    // 6) server override (node-only)
    // --------------------------------------------------------------------------
    // Server code is intended to run in Node. Narrow globals to node/commonjs.
    // ==========================================================================

    {
        name: "server-node-only",
        files: ["src/server/**/*.js"],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.commonjs,
            },
        },
    },

    // ==========================================================================
    // 7) tests override (Mocha-style)
    // --------------------------------------------------------------------------
    // Declare common Mocha globals for test files.
    // ==========================================================================

    {
        name: "tests",
        files: ["test/**/*.js"],
        languageOptions: {
            globals: {
                suite: "readonly",
                test: "readonly",
                setup: "readonly",
                teardown: "readonly",
            },
        },
        rules: {
            "no-undef": "warn",
        },
    },

    // ==========================================================================
    // 8) tools override
    // --------------------------------------------------------------------------
    // Tooling scripts are maintenance-oriented; keep baseline behavior.
    // ==========================================================================

    {
        name: "tools",
        files: ["tools/**/*.js"],
        rules: {
            "no-undef": "warn",
        },
    },

    // ==========================================================================
    // 9) Narrow, file-scoped exceptions
    // --------------------------------------------------------------------------
    // These are intentionally limited to specific files to avoid loosening rules
    // across the entire repository.
    // ==========================================================================

    {
        name: "module-utils-exception",
        files: ["src/modules/utils.js"],
        rules: {
            "no-global-assign": "off",
        },
    },

    {
        name: "plugin-file-local-names",
        files: ["src/plugins/cordova-plugin-file/app-host-non-webkit-handlers.js"],
        rules: {
            "no-unused-vars": [
                "error",
                {
                    args: "none",
                    caughtErrors: "none",
                    varsIgnorePattern:
                        "^(ex|err|e|error|size|isBinary|parentFullPath|name)$",
                },
            ],
        },
    },

    {
        name: "tools-i18n-update-local-names",
        files: ["tools/i18n/update.js"],
        rules: {
            "no-unused-vars": [
                "error",
                {
                    args: "none",
                    caughtErrors: "none",
                    varsIgnorePattern: "^(ex|err|e|error|depth)$",
                },
            ],
        },
    },

    {
        name: "tools-xliff-json-conv-local-names",
        files: ["tools/i18n/xliff-json-conv.js"],
        rules: {
            "no-unused-vars": [
                "error",
                {
                    args: "none",
                    caughtErrors: "none",
                    varsIgnorePattern: "^(ex|err|e|error|fromStrings)$",
                },
            ],
        },
    },
]);