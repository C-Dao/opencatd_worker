import app from "./core/index";
import { WorkerKV } from "./worker/db";
import { Hono } from "hono";
import { Bindings } from "./type";
import { logger } from 'hono/logger'

const server_app = new Hono<{ Bindings: Bindings }>();

server_app.use('*', logger())

server_app.use((ctx, next) => {
  if (!ctx.env.kv) {
    ctx.env.kv = new WorkerKV(ctx.env.OPENCAT_DB);
  }

  return next();
});

server_app.route("/", app);

export default server_app;
