export type UserK = `user::id::${number}` | `user::id`;
export type KeyK = `key::id::${number}` | `key::id`;
export type DBConfigK = `db::config`;
export type PrefixK = `user::id` | `key::id` | DBConfigK;
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
  OPENCAT_DB: KVNamespace<UserK | KeyK | DBConfigK>;
  OPENAI_DOMAIN: string;
  opencatDB: KV<UserK | KeyK | DBConfigK>;
};

export interface KV<T extends string = string> {
  get<U>(key: T): Promise<{ value: U | null }>;
  list<U>(
    prefix: T
  ): Promise<{ key: RemoveUnion<T, PrefixK>; value: U | undefined }[]>;
  put<U>(key: T, value: U): Promise<void>;
  atomicOpt(opts: AtomicOpt[]): Promise<boolean>;
  delete(key: T): Promise<void>;
}

declare global {
  var opencatDB: KV<UserK | KeyK | DBConfigK>;
}

export type AtomicOpt = { action: AtomicOperation; args: any[] };

export type AtomicOperation = "check" | "delete" | "set";

export type RemoveUnion<T, U> = T extends U ? never : T;
