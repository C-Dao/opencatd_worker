import { AtomicOpt, KV, PrefixK, RemoveUnion } from "../core/type.ts";

export class KVDeno<Key extends string = string> implements KV<Key> {
  constructor(private db: Deno.Kv) {}

  private atomic() {
    const atomicExec: Deno.AtomicOperation = this.db.atomic();
    return {
      atomicExec: atomicExec,
      async check(...args: any[]) {
        this.atomicExec = this.atomicExec.check(...args);
        return this;
      },
      async set(key: Key, value: any) {
        const keys = key.split("::");
        this.atomicExec = this.atomicExec.set(keys, value);
        return this;
      },
      async delete(key: Key) {
        const keys = key.split("::");
        this.atomicExec = this.atomicExec.delete(keys);
        return this;
      },
      async commit() {
        return this.atomicExec.commit();
      },
    };
  }

  async get<Value>(key: Key) {
    return await this.db.get<Value>(key.split("::"));
  }

  async list<Value>(prefix: Key) {
    const result = await collect(
      this.db.list<Value>({ prefix: prefix.split("::") })
    );

    return result.map((item) => ({
      key: item.key.join("::") as RemoveUnion<Key, PrefixK>,
      value: item.value,
    }));
  }

  async put<Value>(key: Key, value: Value) {
    await this.db.set(key.split("::"), value);
    return;
  }

  async atomicOpt(opts: AtomicOpt[]) {
    let atomicExec = this.atomic();

    opts.map(({ action, args }) => {
      // @ts-ignore
      atomicExec = atomicExec[action](...args);
    });

    const ok = await atomicExec.commit();

    return !!ok;
  }

  async delete(key: Key): Promise<void> {
    return await this.db.delete(key.split("::"));
  }
}

async function collect<T>(it: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = [];
  for await (const item of it) {
    result.push(item);
  }
  return result;
}
