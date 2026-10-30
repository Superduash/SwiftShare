import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs}'],
    plugins: {
      react: reactPlugin
    },
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        console: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        XMLHttpRequest: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        crypto: 'readonly',
        Notification: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        requestIdleCallback: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        AbortController: 'readonly',
        getComputedStyle: 'readonly',
        MutationObserver: 'readonly',
        XMLSerializer: 'readonly',
        Image: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        BroadcastChannel: 'readonly',
        FormData: 'readonly',
        ClipboardItem: 'readonly'
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': 'off',
      'no-empty': 'off'
    }
  }
];

