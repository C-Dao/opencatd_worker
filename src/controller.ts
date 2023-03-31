import { Handler, MiddlewareHandler } from "hono";
import { Bindings, DBConfig, Key, KeyK, User } from "./type";
import { uuid } from "@cfworker/uuid";

export const users: Record<string, Handler<{ Bindings: Bindings }>> = {
  async init(ctx) {
    const { metadata: user } = await ctx.env.OPENCAT_DB.getWithMetadata(
      "user::id::0"
    );
    if (user) {
      return ctx.json(
        {
          error: "super user already exists, please input token",
        },
        200
      );
    } else {
      const user: User = {
        id: 0,
        name: "root",
        token: uuid(),
      };

      const dbConfig: DBConfig = {
        user_id_count: 0,
        key_id_count: 0,
      };

      await ctx.env.OPENCAT_DB.put("user::id::0", JSON.stringify(user), {
        metadata: user,
      });

      await ctx.env.OPENCAT_DB.put("db::config", JSON.stringify(dbConfig), {
        metadata: dbConfig,
      });

      return ctx.json(user);
    }
  },
  async get_all(ctx) {
    let users = await ctx.env.OPENCAT_DB.list({ prefix: "user::id::" });
    return ctx.json(users.keys.map((user) => user.metadata));
  },
  async add(ctx) {
    const { name } = await ctx.req.json();
    let { metadata: dbConfig } =
      await ctx.env.OPENCAT_DB.getWithMetadata<DBConfig>("db::config");

    if (!dbConfig) {
      return ctx.json({ error: "db config not initialized" });
    }

    const user: User = {
      id: dbConfig.user_id_count + 1,
      name,
      token: uuid(),
    };

    await ctx.env.OPENCAT_DB.put(`key::id::${user.id}`, JSON.stringify(user), {
      metadata: user,
    });

    dbConfig = {
      ...dbConfig,
      user_id_count: dbConfig.user_id_count + 1,
    };

    await ctx.env.OPENCAT_DB.put(`db::config`, JSON.stringify(dbConfig), {
      metadata: dbConfig,
    });
    return ctx.json(user);
  },
  async delete(ctx) {
    const id = ctx.req.param("id");

    if (id == undefined || isNaN(Number(id))) {
      return ctx.json({ error: "id is not a number" });
    }

    await ctx.env.OPENCAT_DB.delete(`user::id::${Number(id)}`);

    return ctx.json({ message: "ok" });
  },
  async reset(ctx) {
    const id = ctx.req.param("id");
    let { metadata: user } = await ctx.env.OPENCAT_DB.getWithMetadata<User>(
      `user::id::${Number(id)}`
    );

    if (!user) {
      return ctx.json({ error: "user not found" });
    }

    user = { ...user, token: uuid() };

    await ctx.env.OPENCAT_DB.put(
      `user::id::${Number(id)}`,
      JSON.stringify(user),
      {
        metadata: user,
      }
    );

    return ctx.json(user);
  },
};

export const keys: Record<string, Handler<{ Bindings: Bindings }>> = {
  async get_all(ctx) {
    const keys = await ctx.env.OPENCAT_DB.list({ prefix: "key::id::" });
    return ctx.json(keys.keys.map((key) => key.metadata));
  },
  async add(ctx) {
    const { name, key } = await ctx.req.json();
    let { metadata: dbConfig } =
      await ctx.env.OPENCAT_DB.getWithMetadata<DBConfig>("db::config");

    if (!dbConfig) {
      return ctx.json({ error: "db metadata not initialized" });
    }

    const item: Key = {
      id: dbConfig.key_id_count + 1,
      key,
      name,
    };

    await ctx.env.OPENCAT_DB.put(`key::id::${item.id}`, JSON.stringify(item), {
      metadata: item,
    });

    dbConfig = {
      ...dbConfig,
      key_id_count: dbConfig.key_id_count + 1,
    };

    await ctx.env.OPENCAT_DB.put(`db::config`, JSON.stringify(dbConfig), {
      metadata: dbConfig,
    });

    return ctx.json(item);
  },
  async delete(ctx) {
    const id = ctx.req.param("id");

    if (id == undefined || isNaN(Number(id))) {
      return ctx.json({ error: "id is not a number" });
    }

    await ctx.env.OPENCAT_DB.delete(`key::id::${Number(id)}`);

    return ctx.json({ message: "ok" });
  },
};

export const root: Record<string, Handler<{ Bindings: Bindings }>> = {
  async whoami(ctx) {
    let user = await ctx.env.OPENCAT_DB.getWithMetadata("user::id::0");
    if (user) {
      return ctx.json(user.metadata);
    } else {
      return ctx.json({ error: "not found root user, please init service" });
    }
  },
};

export const openai: Record<string, Handler<{ Bindings: Bindings }>> = {
  async proxy(ctx) {
    const keys = await ctx.env.OPENCAT_DB.list<Key>({ prefix: "key::id::" });
    const randomIndex = Math.floor(Math.random() * keys.keys.length);

    const openaiToken = keys.keys[randomIndex].metadata?.key;

    let req_headers = new Headers(ctx.req.headers);

    req_headers.set("Authorization", "Bearer " + openaiToken);

    const request = new Request(ctx.env.OPENAI_DOMAIN + ctx.req.path, {
      body: ctx.req.body,
      method: ctx.req.method,
      headers: req_headers,
    });

    const response = await fetch(request);

    for (let header of response.headers.entries()) {
      ctx.header(...header);
    }

    ctx.header("access-control-allow-origin", "*");
    ctx.header("access-control-allow-credentials", "true");

    if (response.ok) {
      return ctx.body(response.body, 200);
    } else {
      return ctx.json({ error: JSON.stringify(await response.json()) }, 200);
    }
  },
};

export const auth: Record<string, MiddlewareHandler<{ Bindings: Bindings }>> = {
  async root(ctx, next) {
    const auth = ctx.req.header("Authorization");

    if (!auth || !auth.startsWith("Bearer")) {
      return ctx.json({ error: "Unauthorized" }, 401);
    }

    const token = auth.slice(7);

    const { metadata: user } = await ctx.env.OPENCAT_DB.getWithMetadata<User>(
      "user::id::0"
    );

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

    const users = await ctx.env.OPENCAT_DB.list<User>({
      prefix: "user::id::",
    });

    const existed = users.keys.find((user) => user.metadata?.token === token);
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
