export type Bindings = {
  OPENCAT_DB: KVNamespace<UserK | KeyK | DBConfigK>;
  OPENAI_DOMAIN: string;
};

export type DBConfig = {
  user_id_count: number;
  key_id_count: number;
};

export type UserK = `user::id::${number}`;
export type KeyK = `key::id::${number}`;
export type DBConfigK = `db::config`;

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


declare global {
  function getMiniflareBindings(): Bindings;
}
