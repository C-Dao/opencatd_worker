import { AtomicOpt, KV } from "../type.ts";

export class DenoKV implements KV {
  constructor(private db: Deno.Kv) {}

  private atomic() {
    const atomicExec: Deno.AtomicOperation = this.db.atomic();
    return {
      atomicExec: atomicExec,
      check(...args: Deno.AtomicCheck[]) {
        this.atomicExec = this.atomicExec.check(...args);
        return this;
      },
      set<U = unknown>(key: (string | number)[], value: U) {
        this.atomicExec = this.atomicExec.set(key, value);
        return this;
      },
      delete(key: (string | number)[]) {
        this.atomicExec = this.atomicExec.delete(key);
        return this;
      },
      commit() {
        return this.atomicExec.commit();
      },
    };
  }

  async get<Value>(key: (string | number)[]) {
    return await this.db.get<Value>(key);
  }

  async list<Value>(prefix: (string | number)[]) {
    const result = await collect(this.db.list<Value>({ prefix: prefix }));

    return result.map((item) => ({
      key: item.key as (string | number)[],
      value: item.value,
    }));
  }

  async put<Value>(key: (string | number)[], value: Value) {
    await this.db.set(key, value);
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

  async delete(key: (string | number)[]): Promise<void> {
    return await this.db.delete(key);
  }
}

async function collect<T>(it: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = [];
  for await (const item of it) {
    result.push(item);
  }
  return result;
}
