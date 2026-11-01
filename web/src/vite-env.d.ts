/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The Legará server's address, e.g. https://legara-xy12.vercel.app. Empty until you set it up. */
  readonly VITE_SCAN_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
