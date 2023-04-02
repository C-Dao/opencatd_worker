import {
  AtomicOperation,
  AtomicOpt,
  KV,
  PrefixK,
  RemoveUnion,
} from "../core/type.ts";

export class KVWorker<Key extends string = string> implements KV<Key> {
  constructor(private db: KVNamespace<Key>) {}

  async get<Value>(key: Key) {
    const { metadata } = await this.db.getWithMetadata<Value>(key);
    return { value: metadata };
  }

  async list<Value>(prefix: Key) {
    const result: {
      key: RemoveUnion<Key, PrefixK>;
      value: Value | undefined;
    }[] = [];
    let cursor = undefined;

    while (true) {
      const lists: KVNamespaceListResult<Value, Key> =
        await this.db.list<Value>({
          prefix,
          cursor,
        });

      const keyValue = lists.keys.map((item) => ({
        key: item.name,
        value: item.metadata,
      }));

      result.push(
        ...(keyValue as {
          key: RemoveUnion<Key, PrefixK>;
          value: Value | undefined;
        }[])
      );

      if ("cursor" in lists) {
        cursor = lists.cursor;
      }

      if (lists.list_complete) {
        break;
      }
    }

    return result;
  }

  async put<Value>(key: Key, value: Value) {
    return this.db.put(key, JSON.stringify(value), { metadata: value });
  }

  async delete(key: Key) {
    return await this.db.delete(key);
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
        return this.db[
          action as RemoveUnion<AtomicOperation, "check" | "set">
          //@ts-ignore
        ](...args);
      })
    );

    return true;
  }
}
