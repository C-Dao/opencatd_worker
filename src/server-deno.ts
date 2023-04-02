import { serve } from "deno/server";
import app from "./core/index.ts";
import { DenoKV } from "./deno/db.ts";
import { load } from "dotenv";
import { Hono } from "hono";
import { Bindings } from "./type.ts";
import { env } from "hono/adapter";

await load();

globalThis.opencatDB = new DenoKV(await Deno.openKv());

const server_app = new Hono<{ Bindings: Bindings }, any>();

server_app.use((ctx, next) => {
  if (!ctx.env) {
    ctx.env = env(ctx);
  }
  if (!ctx.env.opencatDB) {
    ctx.env.opencatDB = globalThis.opencatDB;
  }

  return next();
});

server_app.route("/", app);

serve(server_app.fetch);
