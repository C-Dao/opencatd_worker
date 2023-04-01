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
