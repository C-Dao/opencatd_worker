import { Handler, MiddlewareHandler } from "hono";
import { Bindings, DBConfig, Key, User } from "../type.ts";
import { StatusCode } from "hono/utils/http-status";

export const users: Record<string, Handler<{ Bindings: Bindings }>> = {
  async init(ctx) {
    const { value: user } = await ctx.env.opencatDB.get<User>("user::id::0");
    if (user) {
      return ctx.json(
        {
          error: "super user already exists, please input token",
        },
        403
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

      const ok = await ctx.env.opencatDB.atomicOpt([
        { action: "check", args: [] },
        { action: "set", args: ["user::id::0", user] },
        { action: "set", args: ["db::config", dbConfig] },
      ]);

      if (!ok) {
        return ctx.json({ error: "commit conflict" }, 409);
      }

      return ctx.json(user);
    }
  },

  async getAll(ctx) {
    let users = await ctx.env.opencatDB.list<User>("user::id");
    return ctx.json(users.map((user) => user.value));
  },

  async add(ctx) {
    const { name } = await ctx.req.json();
    const dbConfigEntry = await ctx.env.opencatDB.get<DBConfig>("db::config");

    if (!dbConfigEntry.value) {
      return ctx.json({ error: "db config not initialized" }, 403);
    }

    const user: User = {
      id: dbConfigEntry.value.user_id_count + 1,
      name,
      token: crypto.randomUUID(),
    };

    const dbConfig = {
      ...dbConfigEntry.value,
      user_id_count: dbConfigEntry.value.user_id_count + 1,
    };

    const ok = await ctx.env.opencatDB.atomicOpt([
      { action: "check", args: [dbConfigEntry] },
      { action: "set", args: [`user::id::${user.id}`, user] },
      { action: "set", args: ["db::config", dbConfig] },
    ]);

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

    await ctx.env.opencatDB.delete(`user::id::${Number(id)}`);

    return ctx.json({ message: "ok" });
  },

  async reset(ctx) {
    const id = ctx.req.param("id");
    const userEntry = await ctx.env.opencatDB.get<User>(
      `user::id::${Number(id)}`
    );

    if (!userEntry.value) {
      return ctx.json({ error: "user not found" }, 404);
    }

    const user = { ...userEntry.value, token: crypto.randomUUID() };

    const ok = await ctx.env.opencatDB.atomicOpt([
      { action: "check", args: [userEntry] },
      { action: "set", args: [`user::id::${Number(id)}`, user] },
    ]);

    if (!ok) {
      return ctx.json({ error: "commit conflict" }, 409);
    }

    return ctx.json(user);
  },
};

export const keys: Record<string, Handler<{ Bindings: Bindings }>> = {
  async getAll(ctx) {
    const keys = await ctx.env.opencatDB.list<Key>("key::id");
    return ctx.json(keys.map((item) => item.value));
  },

  async add(ctx) {
    const { name, key } = await ctx.req.json();
    let dbConfigEntry = await ctx.env.opencatDB.get<DBConfig>("db::config");

    if (!dbConfigEntry.value) {
      return ctx.json({ error: "db metadata not initialized" }, 403);
    }

    const item: Key = {
      id: dbConfigEntry.value.key_id_count + 1,
      key,
      name,
    };

    const dbConfig = {
      ...dbConfigEntry.value,
      key_id_count: dbConfigEntry.value.key_id_count + 1,
    };

    const ok = await ctx.env.opencatDB.atomicOpt([
      { action: "check", args: [dbConfigEntry] },
      { action: "set", args: [`key::id::${item.id}`, item] },
      { action: "set", args: ["db::config", dbConfig] },
    ]);

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

    await ctx.env.opencatDB.delete(`key::id::${Number(id)}`);

    return ctx.json({ message: "ok" });
  },
};

export const root: Record<string, Handler<{ Bindings: Bindings }>> = {
  async whoami(ctx) {
    let { value: user } = await ctx.env.opencatDB.get("user::id::0");
    if (user) {
      return ctx.json(user);
    } else {
      return ctx.json(
        { error: "not found root user, please init service" },
        404
      );
    }
  },
};

export const openai: Record<string, Handler<{ Bindings: Bindings }>> = {
  async proxy(ctx) {
    const keyEntries = await ctx.env.opencatDB.list<Key>("key::id");
    const randomIndex = Math.floor(Math.random() * keyEntries.length);

    const openaiToken = keyEntries[randomIndex].value?.key;

    const reqHeaders = new Headers(ctx.req.headers);
    const reqQuerys = new URLSearchParams(ctx.req.query()).toString();

    reqHeaders.set("Authorization", "Bearer " + openaiToken);

    const request = new Request(
      `${ctx.env.OPENAI_DOMAIN}${ctx.req.path}?${reqQuerys}`,
      {
        method: ctx.req.method,
        headers: reqHeaders,
        body: ctx.req.body,
      }
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

export const auth: Record<string, MiddlewareHandler<{ Bindings: Bindings }>> = {
  async root(ctx, next) {
    const auth = ctx.req.header("Authorization");

    if (!auth || !auth.startsWith("Bearer")) {
      return ctx.json({ error: "Unauthorized" }, 401);
    }

    const token = auth.slice(7);

    const { value: user } = await ctx.env.opencatDB.get<User>("user::id::0");

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

    const users = await ctx.env.opencatDB.list<User>("user::id");

    const existed = users.find((user) => user.value?.token === token);
    if (existed) {
      return next();
    } else {
      return ctx.json({ error: "Unauthorized" }, 401);
    }
  },
};

export default {
  openai,
  users,
  keys,
  root,
  auth,
};
