import { serve } from "deno/server";
import app from "./core/index.ts";
import { KVDeno } from "./deno/db.ts";
import { load } from "dotenv";

await load();

globalThis.tokenGen = crypto.randomUUID;
globalThis.opencatDB = new KVDeno(await Deno.openKv());

serve(app.fetch);
