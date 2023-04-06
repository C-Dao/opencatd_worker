import "dotenv/load";
import { serve } from "deno/server";
import { Hono } from "hono";
import { env } from "hono/adapter";
import app from "./core/index.ts";
import { DenoKV } from "./deno/db.ts";
import { Bindings } from "./type.ts";
import { logger } from 'hono/middleware'

globalThis.kv = new DenoKV(await Deno.openKv());

const server_app = new Hono<{ Bindings: Bindings }, any>();

server_app.use('*', logger())

server_app.use((ctx, next) => {
  ctx.env = env(ctx);

  if (!ctx.env.kv) {
    ctx.env.kv = globalThis.kv;
  }

  return next();
});

server_app.route("/", app);

serve(server_app.fetch);
