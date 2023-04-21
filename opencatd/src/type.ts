export type DBConfig = {
  user_id_count: number;
  key_id_count: number;
};

export type User = {
  id: number;
  name: string;
  token: string;
};

export type UsagesResp = {
  userId: number;
  totalUint: number;
  cost: string;
};

export type Usages = {
  user_id: number;
  usages_version: UsagesVersion[];
};

export type UsagesVersion = {
  version: string;
  prompt: { tokens: number; cost: number };
  completion: { tokens: number; cost: number };
};

export type Key = {
  id: number;
  name: string;
  key: string;
};

export type Bindings = {
  OPENCAT_DB: KVNamespace;
  OPENAI_DOMAIN: string;
  kv: KV;
  countLen: (text: string) => Promise<number>;
  gpt_tokens: ServiceWorkerGlobalScope;
};

export interface KV<T extends (string | number)[] = (string | number)[]> {
  get<U>(key: T): Promise<{ value: U | null }>;
  list<U>(prefix: T): Promise<{ key: T; value: U | undefined }[]>;
  put<U>(key: T, value: U): Promise<void>;
  atomicOpt(opts: AtomicOpt[]): Promise<boolean>;
  delete(key: T): Promise<void>;
}

declare global {
  var kv: KV;
  var countLen:
    | ((text: string) => Promise<number>)
    | ((text: string) => number);
}

export type AtomicOpt = { action: AtomicOperation; args: any[] };

export type AtomicOperation = "check" | "delete" | "put";

export type RemoveUnion<T, U> = T extends U ? never : T;
