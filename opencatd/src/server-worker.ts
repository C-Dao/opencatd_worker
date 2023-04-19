import app from "./core/index";
import { WorkerKV } from "./worker/db";
import { Hono } from "hono";
import { Bindings } from "./type";
import { logger } from "hono/logger";

const server_app = new Hono<{ Bindings: Bindings }>();

server_app.use("*", logger());

server_app.use((ctx, next) => {
  if (!ctx.env.kv) {
    ctx.env.kv = new WorkerKV(ctx.env.OPENCAT_DB);
  }

  if (!ctx.env.countLen) {
    ctx.env.countLen = async (text: string) => {
      const resp = await ctx.env.gpt_tokens.fetch("http://.../", {
        method: "POST",
        body: text,
      });
      return Number(await resp.text());
    };
  }

  return next();
});

server_app.route("/", app);

export default server_app;
