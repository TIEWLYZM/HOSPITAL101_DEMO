import "dotenv/config";
import express from "express";
import cors from "cors";
import { initPool, closePool } from "./db.js";
import optionsRoute from "./routes/options.js";
import appointmentsRoute from "./routes/appointments.js";
import dashboardRoute from "./routes/dashboard.js";
import viewsRoute from "./routes/views.js";

process.on('unhandledRejection', (e)=>{ console.error('UNHANDLED_REJECTION:', e?.message||e); });
process.on('uncaughtException', (e)=>{ console.error('UNCAUGHT_EXCEPTION:', e?.message||e); });

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => res.json({ ok: true }));
app.use("/api/options", optionsRoute);
app.use("/api/appointments", appointmentsRoute);
app.use("/api/dashboard", dashboardRoute);
app.use("/api/views", viewsRoute);

const port = process.env.PORT || 8080;

async function start() {
  while (true) {
    try {
      await initPool();
      console.log("DB pool init ✅");
      app.listen(port, () => console.log(`API listening on :${port}`));
      break;
    } catch (e) {
      console.error("DB not ready:", e.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}
start();

process.on("SIGINT", async () => { await closePool(); process.exit(0); });
