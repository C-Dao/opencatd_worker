import app from "./core/index";
import { uuid } from "@cfworker/uuid";
import { KVWorker } from "./worker/db";

globalThis.tokenGen = uuid;
globalThis.opencatDB = new KVWorker(OPENCAT_DB);
export default app;
