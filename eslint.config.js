import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'

// Quy ước của dự án (đề xuất mục 6 "Lint, build"):
// - thời gian chỉ lấy qua shared/clock.ts;
// - số mục học lấy từ cây (soMucHoc), không gõ cứng 199 / 236;
// - mã màu chỉ nằm trong src/styles/ (CSS), không có trong TS/TSX.
const camNgayGio = [
  {
    selector: "NewExpression[callee.name='Date'][arguments.length=0]",
    message: 'Dùng now() / homNay() của shared/clock.ts thay cho new Date().',
  },
  {
    selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
    message: 'Dùng now() của shared/clock.ts thay cho Date.now().',
  },
  {
    selector: "CallExpression[callee.name='Date']",
    message: 'Date() trả về giờ máy; dùng now() / homNay() của shared/clock.ts.',
  },
]
const camSoCay = [
  {
    selector: 'Literal[value=199], Literal[value=236]',
    message: 'Không gõ cứng số nút của cây; dùng soMucHoc từ shared/roadmap.',
  },
]
const camMaMau = [
  {
    selector: 'Literal[value=/#[0-9a-fA-F]{3,8}\\b/]',
    message: 'Mã màu chỉ đặt trong src/styles/ (token CSS).',
  },
  {
    selector: 'TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\\b/]',
    message: 'Mã màu chỉ đặt trong src/styles/ (token CSS).',
  },
]

export default tseslint.config(
  {
    ignores: [
      'dist/',
      'docs/',
      'data/',
      'noi-dung/',
      '.mau/',
      '.frame/',
      'node_modules/',
      'fixtures/mau/noi-dung/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-restricted-syntax': ['error', ...camNgayGio, ...camSoCay],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ...reactHooks.configs.flat['recommended-latest'],
  },
  {
    files: ['src/**/*.tsx'],
    ...jsxA11y.flatConfigs.recommended,
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/styles/**'],
    rules: { 'no-restricted-syntax': ['error', ...camNgayGio, ...camSoCay, ...camMaMau] },
  },
  {
    files: ['shared/clock.ts'],
    rules: { 'no-restricted-syntax': ['error', ...camSoCay] },
  },
  {
    files: ['tests/**', 'fixtures/**'],
    rules: { 'no-restricted-syntax': 'off' },
  },
)
