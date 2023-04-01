import { Handler, MiddlewareHandler } from "hono";
import { DBConfig, Key, User } from "./type.ts";
import { StatusCode } from "hono/utils/http-status.ts";

const kv = await Deno.openKv();

export const users: Record<string, Handler> = {
  async init(ctx) {
    const userEntry = await kv.get(["user", "id", 0]);
    if (userEntry.value) {
      return ctx.json(
        {
          error: "super user already exists, please input token",
        },
        403,
      );
    } else {
      const user: User = {
        id: 0,
        name: "root",
        token: crypto.randomUUID(),
      };

      const dbConfig: DBConfig = {
        user_id_count: 0,
        key_id_count: 0,
      };

      const ok = await kv.atomic()
        .check(userEntry)
        .set(["user", "id", 0], user)
        .set(["db", "config"], dbConfig)
        .commit();
      if (!ok) {
        return ctx.json({ error: "commit conflict" }, 409);
      }

      return ctx.json(user);
    }
  },
  async get_all(ctx) {
    const users = await collect(kv.list({ prefix: ["user", "id"] }));
    return ctx.json(users.map((user) => user.value));
  },
  async add(ctx) {
    const { name } = await ctx.req.json();
    const dbConfigEntry = await kv.get(["db", "config"]);
    let dbConfig = dbConfigEntry.value as DBConfig | null;

    if (!dbConfig) {
      return ctx.json({ error: "db config not initialized" }, 403);
    }

    const user: User = {
      id: dbConfig.user_id_count + 1,
      name,
      token: crypto.randomUUID(),
    };

    dbConfig = {
      ...dbConfig,
      user_id_count: dbConfig.user_id_count + 1,
    };

    const ok = await kv.atomic()
      .check(dbConfigEntry)
      .set(["user", "id", user.id], user)
      .set(["db", "config"], dbConfig)
      .commit();
    if (!ok) {
      return ctx.json({ error: "commit conflict" }, 409);
    }

    return ctx.json(user);
  },
  async delete(ctx) {
    const id = ctx.req.param("id");

    if (id == undefined || isNaN(Number(id))) {
      return ctx.json({ error: "id is not a number" }, 403);
    }

    await kv.delete(["user", "id", Number(id)]);
    return ctx.json({ message: "ok" });
  },
  async reset(ctx) {
    const id = ctx.req.param("id");
    const userEntry = await kv.get(["user", "id", Number(id)]);
    let user = userEntry.value as User | null;

    if (!user) {
      return ctx.json({ error: "user not found" }, 404);
    }

    user = { ...user, token: crypto.randomUUID() };

    const ok = await kv.atomic()
      .check(userEntry)
      .set(["user", "id", Number(id)], user)
      .commit();

    if (!ok) {
      return ctx.json({ error: "commit conflict" }, 409);
    }

    return ctx.json(user);
  },
};

export const keys: Record<string, Handler> = {
  async get_all(ctx) {
    return ctx.json(
      (await collect(kv.list({ prefix: ["key", "id"] }))).map((x) => x.value),
    );
  },
  async add(ctx) {
    const { name, key } = await ctx.req.json();
    const dbConfigEntry = await kv.get(["db", "config"]);
    let dbConfig = dbConfigEntry.value as DBConfig | null;

    if (!dbConfig) {
      return ctx.json({ error: "db metadata not initialized" }, 403);
    }

    const item: Key = {
      id: dbConfig.key_id_count + 1,
      key,
      name,
    };

    dbConfig = {
      ...dbConfig,
      key_id_count: dbConfig.key_id_count + 1,
    };

    const ok = await kv.atomic()
      .check(dbConfigEntry)
      .set(["key", "id", item.id], item)
      .set(["db", "config"], dbConfig)
      .commit();
    if (!ok) {
      return ctx.json({ error: "commit conflict" }, 409);
    }
    return ctx.json(item);
  },
  async delete(ctx) {
    const id = ctx.req.param("id");

    if (id == undefined || isNaN(Number(id))) {
      return ctx.json({ error: "id is not a number" }, 403);
    }

    await kv.delete(["key", "id", Number(id)]);
    return ctx.json({ message: "ok" });
  },
};

export const root: Record<string, Handler> = {
  async whoami(ctx) {
    const userEntry = await kv.get(["user", "id", 0]);
    const user = userEntry.value as User | null;
    if (user) {
      return ctx.json(user);
    } else {
      return ctx.json(
        { error: "not found root user, please init service" },
        404,
      );
    }
  },
};

export const openai: Record<
  string,
  MiddlewareHandler
> = {
  async proxy(ctx) {
    const keyEntries = await collect(kv.list({ prefix: ["key", "id"] }));
    const randomIndex = Math.floor(Math.random() * keyEntries.length);
    const key = keyEntries[randomIndex]?.value as Key | undefined;

    const openaiToken = key?.key;

    const req_headers = new Headers(ctx.req.headers);
    const req_querys = new URLSearchParams(ctx.req.query()).toString();

    req_headers.set("Authorization", "Bearer " + openaiToken);

    const request = new Request(
      `${
        ctx.env.OPENAI_DOMAIN ?? "https://api.openai.com"
      }${ctx.req.path}?${req_querys}`,
      {
        method: ctx.req.method,
        headers: req_headers,
        body: ctx.req.body,
      },
    );

    const response = await fetch(request);

    for (const header of response.headers.entries()) {
      ctx.header(...header);
    }

    ctx.header("access-control-allow-origin", "*");
    ctx.header("access-control-allow-credentials", "true");

    return ctx.body(response.body, (response.status as StatusCode) || 200);
  },
};

export const auth: Record<string, MiddlewareHandler> = {
  async root(ctx, next) {
    const auth = ctx.req.header("Authorization");

    if (!auth || !auth.startsWith("Bearer")) {
      return ctx.json({ error: "Unauthorized" }, 401);
    }

    const token = auth.slice(7);

    const userEntry = await kv.get(["user", "id", 0]);
    const user = userEntry.value as User | null;

    if (!user) {
      return ctx.json({ error: "Unauthorized" }, 401);
    }

    const existed = token === user.token;

    if (existed) {
      return next();
    } else {
      return ctx.json({ error: "Unauthorized" }, 401);
    }
  },

  async openai(ctx, next) {
    const auth = ctx.req.header("Authorization");
    if (!auth || !auth.startsWith("Bearer")) {
      return ctx.json({ error: "Unauthorized" }, 401);
    }

    const token = auth.slice(7);

    const users = await collect(kv.list({ prefix: ["user", "id"] }));

    const existed = users.find((user) => (user.value as User).token === token);
    if (existed) {
      return next();
    } else {
      return ctx.json({ error: "Unauthorized" }, 401);
    }
  },
};

async function collect<T>(it: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = [];
  for await (const item of it) {
    result.push(item);
  }
  return result;
}

export default {
  openai,
  users,
  keys,
  root,
  auth,
};
