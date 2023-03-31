/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
  //
  // Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
  // MY_SERVICE: Fetcher;
}

import { Hono } from "hono";
import controller from "./controller";
import { Bindings } from "./type";

const app = new Hono<{ Bindings: Bindings }>();
const middleware = {
  root: new Hono<{ Bindings: Bindings }>(),
  openai: new Hono<{ Bindings: Bindings }>(),
};
const users = new Hono<{ Bindings: Bindings }>();
const keys = new Hono<{ Bindings: Bindings }>();
const root = new Hono<{ Bindings: Bindings }>();
const openai = new Hono<{ Bindings: Bindings }>();

users.get("/", controller.users.get_all);
users.post("/", controller.users.add);
users.delete("/", controller.users.delete);
users.post("/:id/reset", controller.users.reset);

keys.get("/", controller.keys.get_all);
keys.post("/", controller.keys.add);
keys.delete("/:id", controller.keys.delete);

root.get("/", controller.root.whoami);

openai.post("/*", controller.openai.proxy);

middleware.root.use("*", controller.auth.root);
middleware.openai.use("*", controller.auth.openai);

app.post("/1/users/init", controller.users.init);

app.route("/1", middleware.root);
app.route("/1/users", users);
app.route("/1/keys", keys);
app.route("/1/me", root);

app.route("/v1", middleware.openai);
app.route("/v1", openai);

export default app;
