/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set only in PR preview builds (see .github/workflows/pr-preview.yml). */
  readonly VITE_PREVIEW_PR?: string;
}
