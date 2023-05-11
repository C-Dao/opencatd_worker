import { Handler, MiddlewareHandler } from "hono";
import { createParser } from "eventsource-parser";
import {
  Bindings,
  DBConfig,
  Key,
  Usages,
  UsagesResp,
  UsagesVersion,
  User,
} from "../type.ts";
import { StatusCode } from "hono/utils/http-status";

const versions_billing = {
  "gpt-4": { prompt: 0.03 / 1000, completion: 0.06 / 1000 },
  "gpt-4-0314": { prompt: 0.03 / 1000, completion: 0.06 / 1000 },
  "gpt-4-32k": { prompt: 0.06 / 1000, completion: 0.12 / 1000 },
  "gpt-4-32k-0314": { prompt: 0.03 / 1000, completion: 0.12 / 1000 },
  "gpt-3.5-turbo": { prompt: 0.002 / 1000, completion: 0.002 / 1000 },
  "gpt-3.5-turbo-0301": { prompt: 0.002 / 1000, completion: 0.002 / 1000 },
};

const calcTokens = (usages: UsagesVersion[] = []) => {
  return usages.reduce((prev, cur) => {
    return prev + cur.prompt.tokens + cur.completion.tokens;
  }, 0);
};

const calcCost = (usages: UsagesVersion[] = []) => {
  return usages.reduce((prev, cur) => {
    return prev + cur.prompt.cost + cur.completion.cost;
  }, 0);
};

export const usages: Record<string, Handler<{ Bindings: Bindings }>> = {
  async getAll(ctx) {
    let usages = await ctx.env.kv.list<Usages>(["usages", "id"]);
    const resp: UsagesResp[] = usages.map((item) => {
      return {
        userId: item.value!.user_id,
        totalUint: calcTokens(item.value?.usages_version),
        cost: calcCost(item.value?.usages_version).toFixed(7),
      };
    });
    return ctx.json(resp);
  },
};

export const users: Record<string, Handler<{ Bindings: Bindings }>> = {
  async init(ctx) {
    const { value: user } = await ctx.env.kv.get<User>(["user", "id", 0]);
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

      const ok = await ctx.env.kv.atomicOpt([
        { action: "check", args: [] },
        { action: "put", args: [["user", "id", 0], user] },
        { action: "put", args: [["db", "config"], dbConfig] },
      ]);

      if (!ok) {
        return ctx.json({ error: "commit conflict" }, 409);
      }

      return ctx.json(user);
    }
  },

  async getAll(ctx) {
    let users = await ctx.env.kv.list<User>(["user", "id"]);
    return ctx.json(users.map((user) => user.value));
  },

  async add(ctx) {
    const { name } = await ctx.req.json();
    const dbConfigEntry = await ctx.env.kv.get<DBConfig>(["db", "config"]);

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

    const ok = await ctx.env.kv.atomicOpt([
      { action: "check", args: [dbConfigEntry] },
      { action: "put", args: [["user", "id", user.id], user] },
      { action: "put", args: [["db", "config"], dbConfig] },
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

    await ctx.env.kv.delete(["user", "id", Number(id)]);

    return ctx.json({ message: "ok" });
  },

  async reset(ctx) {
    const id = ctx.req.param("id");
    const userEntry = await ctx.env.kv.get<User>(["user", "id", Number(id)]);

    if (!userEntry.value) {
      return ctx.json({ error: "user not found" }, 404);
    }

    const user = { ...userEntry.value, token: crypto.randomUUID() };

    const ok = await ctx.env.kv.atomicOpt([
      { action: "check", args: [userEntry] },
      { action: "put", args: [["user", "id", Number(id)], user] },
    ]);

    if (!ok) {
      return ctx.json({ error: "commit conflict" }, 409);
    }

    return ctx.json(user);
  },
};

export const keys: Record<string, Handler<{ Bindings: Bindings }>> = {
  async getAll(ctx) {
    const keys = await ctx.env.kv.list<Key>(["key", "id"]);
    const fillZeroKeys = keys.map((item) => {
      const key = item.value as Key;
      const len = key.key.length;
      key.key = `${key.key
        .split("")
        .fill("0", 7, len - 4)
        .join("")}`;
      return key;
    });
    return ctx.json(fillZeroKeys);
  },

  async add(ctx) {
    const { name, key } = await ctx.req.json();
    let dbConfigEntry = await ctx.env.kv.get<DBConfig>(["db", "config"]);

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

    const ok = await ctx.env.kv.atomicOpt([
      { action: "check", args: [dbConfigEntry] },
      { action: "put", args: [["key", "id", item.id], item] },
      { action: "put", args: [["db", "config"], dbConfig] },
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

    await ctx.env.kv.delete(["key", "id", Number(id)]);

    return ctx.json({ message: "ok" });
  },
};

export const root: Record<string, Handler<{ Bindings: Bindings }>> = {
  async whoami(ctx) {
    let { value: user } = await ctx.env.kv.get(["user", "id", 0]);
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
    const keyEntries = await ctx.env.kv.list<Key>(["key", "id"]);
    const randomIndex = Math.floor(Math.random() * keyEntries.length);
    const token = ctx.req.header("Authorization")?.slice(7);
    const openaiToken = keyEntries[randomIndex].value?.key;
    const user = (await ctx.env.kv.list<User>(["user", "id"])).find(
      (it) => it.value?.token === token
    );

    if (!user?.value) {
      return ctx.json({ error: "not found user, user is no exsit" }, 404);
    }

    let { value: usages } = await ctx.env.kv.get<Usages>([
      "usages",
      "id",
      user.value.id,
    ]);

    if (!usages) {
      usages = {
        user_id: user.value.id,
        usages_version: [],
      };
    }

    const reqHeaders = new Headers(ctx.req.headers);
    const reqQuerys = new URLSearchParams(ctx.req.query()).toString();

    reqHeaders.set("Authorization", "Bearer " + openaiToken);

    let counts = {
      version: "",
      prompt: { tokens: 0, cost: 0 },
      completion: { tokens: 0, cost: 0 },
    };

    let allReqContent = "";

    const reqTransform = new TransformStream({
      async transform(chunk, controller) {
        allReqContent += new TextDecoder().decode(chunk);
        controller.enqueue(chunk);
      },
      async flush() {
        const json: any = JSON.parse(allReqContent);
        const messages = json.messages.map((msg: any) => msg.content);
        counts.version = json.model;
        counts.prompt.tokens = await ctx.env.countLen(messages.join(""));
        counts.prompt.cost =
          versions_billing[counts.version as keyof typeof versions_billing]
            .prompt * counts.prompt.tokens;
      },
    });

    const request = new Request(
      `${ctx.env.OPENAI_DOMAIN}${ctx.req.path}?${reqQuerys}`,
      {
        method: ctx.req.method,
        headers: reqHeaders,
        body:
          ctx.req.path === "/v1/chat/completions"
            ? ctx.req.body?.pipeThrough(reqTransform) || null
            : ctx.req.body,
      }
    );

    const response = await fetch(request);

    for (const header of response.headers.entries()) {
      ctx.header(...header);
    }

    let allContent = "";
    const decoder = new TextDecoder();
    function onParse(event: any) {
      if (event.type === "event") {
        const data = event.data;
        // https://beta.openai.com/docs/api-reference/completions/create#completions/create-stream
        if (data === "[DONE]") {
          return;
        }
        try {
          const json = JSON.parse(data);
          // 拼接所有响应
          allContent += json.choices.map((it: any) => it.delta.content).join("");
        } catch (e) {
          console.error(e);
        }
      }
    }
    const parser = createParser(onParse);

    const respTransform = new TransformStream({
      async transform(chunk, controller) {
        parser.feed(decoder.decode(chunk, { stream: true }));
        controller.enqueue(chunk);
      },
      async flush() {
        counts.completion.tokens += await ctx.env.countLen(allContent);
        counts.completion.cost =
          versions_billing[counts.version as keyof typeof versions_billing]
            .completion * counts.completion.tokens;

        const index = usages!.usages_version.findIndex(
          (item) => item.version === counts.version
        );

        if (~index) {
          usages!.usages_version[index].prompt.tokens += counts.prompt.tokens;
          usages!.usages_version[index].completion.tokens +=
            counts.completion.tokens;
          usages!.usages_version[index].completion.cost +=
            counts.completion.cost;
          usages!.usages_version[index].prompt.cost += counts.prompt.cost;
        } else {
          usages!.usages_version.push(counts);
        }

        await ctx.env.kv.atomicOpt([
          { action: "put", args: [["usages", "id", usages!.user_id], usages] },
        ]);
      },
    });

    return ctx.body(
      ctx.req.path === "/v1/chat/completions"
        ? response.body?.pipeThrough(respTransform) || null
        : response.body,
      (response.status as StatusCode) || 200
    );
  },
};

export const auth: Record<string, MiddlewareHandler<{ Bindings: Bindings }>> = {
  async root(ctx, next) {
    const auth = ctx.req.header("Authorization");

    if (!auth || !auth.startsWith("Bearer")) {
      return ctx.json({ error: "Unauthorized" }, 401);
    }

    const token = auth.slice(7);

    const { value: user } = await ctx.env.kv.get<User>(["user", "id", 0]);

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
    if (ctx.req.method === "OPTIONS") {
      ctx.res.headers.append("access-control-allow-origin", "*");
      ctx.res.headers.append("access-control-allow-credentials", "true");
      ctx.res.headers.append("access-control-allow-headers", "*");

      return new Response(null, {
        headers: ctx.res.headers,
        status: 204,
      });
    }

    const auth = ctx.req.header("Authorization");

    if (!auth || !auth.startsWith("Bearer")) {
      return ctx.json({ error: "Unauthorized" }, 401);
    }

    const token = auth.slice(7);

    const users = await ctx.env.kv.list<User>(["user", "id"]);

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
  usages,
};
