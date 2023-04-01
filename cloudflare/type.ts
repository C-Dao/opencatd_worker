export type { DBConfig, Key, User } from "../shared/type.ts";

export type UserK = `user::id::${number}`;
export type KeyK = `key::id::${number}`;
export type DBConfigK = `db::config`;

export type Bindings = {
  OPENCAT_DB: KVNamespace<UserK | KeyK | DBConfigK>;
  OPENAI_DOMAIN: string;
};

declare global {
  function getMiniflareBindings(): Bindings;
}
