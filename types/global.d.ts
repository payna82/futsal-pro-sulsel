declare const process: {
  env?: Record<string, string | undefined>;
};

declare global {
  namespace NodeJS {
    interface ProcessEnv extends Record<string, string | undefined> {}
  }
}

interface ImportMeta {
  env?: Record<string, string | undefined>;
}

export {};
