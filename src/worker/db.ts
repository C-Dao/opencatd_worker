import { AtomicOpt, KV } from "../type.ts";

export class WorkerKV implements KV {
  constructor(private db: KVNamespace) {}

  async get<Value>(key: string[]) {
    const { metadata } = await this.db.getWithMetadata<Value>(key.join("::"));
    return { value: metadata };
  }

  async list<Value>(prefix: string[]) {
    const result = [];
    let cursor = undefined;

    while (true) {
      const lists: KVNamespaceListResult<Value> = await this.db.list<Value>({
        prefix: prefix.join("::"),
        cursor,
      });

      const keyValue = lists.keys.map((item) => ({
        key: item.name.split("::"),
        value: item.metadata,
      }));

      result.push(...keyValue);

      if ("cursor" in lists) {
        cursor = lists.cursor;
      }

      if (lists.list_complete) {
        break;
      }
    }

    return result;
  }

  async put<Value>(key: (string | number)[], value: Value) {
    return this.db.put(key.join("::"), JSON.stringify(value), {
      metadata: value,
    });
  }

  async delete(key: (string | number)[]) {
    return await this.db.delete(key.join("::"));
  }

  async atomicOpt(opts: AtomicOpt[]) {
    await Promise.all(
      opts.map(({ action, args }) => {
        if (action === "check") {
          return;
        }
        if (action === "set") {
          //@ts-ignore
          action = "put";
        }

        //@ts-ignore
        return this[action](...args);
      })
    );

    return true;
  }
}
