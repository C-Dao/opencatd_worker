export type DBConfig = {
  user_id_count: number;
  key_id_count: number;
};

export type User = {
  id: number;
  name: string;
  token: string;
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
}

export type AtomicOpt = { action: AtomicOperation; args: any[] };

export type AtomicOperation = "check" | "delete" | "set";

export type RemoveUnion<T, U> = T extends U ? never : T;
