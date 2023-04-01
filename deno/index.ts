import { Hono } from "hono";
import controller from "./controller.ts";
import { serve } from "https://deno.land/std@0.182.0/http/server.ts";

const app = new Hono();
const middleware = {
  root: new Hono(),
  openai: new Hono(),
};
const users = new Hono();
const keys = new Hono();
const root = new Hono();
const openai = new Hono();

users.get("/", controller.users.get_all);
users.post("/", controller.users.add);
users.delete("/", controller.users.delete);
users.post("/:id/reset", controller.users.reset);

keys.get("/", controller.keys.get_all);
keys.post("/", controller.keys.add);
keys.delete("/:id", controller.keys.delete);

root.get("/", controller.root.whoami);

openai.use("/*", controller.openai.proxy);

middleware.root.use("*", controller.auth.root);
middleware.openai.use("*", controller.auth.openai);

app.post("/1/users/init", controller.users.init);

app.route("/1", middleware.root);
app.route("/1/users", users);
app.route("/1/keys", keys);
app.route("/1/me", root);

app.route("/v1", middleware.openai);
app.route("/v1", openai);

serve(app.fetch);
