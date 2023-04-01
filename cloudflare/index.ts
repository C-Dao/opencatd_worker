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

export default app;
