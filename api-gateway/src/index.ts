import express from "express";
import { config } from "./config";
import { stocksRouter } from "./routes/stocks";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

app.get("/health", (_req, res) => res.json({ status: "ok", service: "api-gateway" }));

app.use("/api/stocks", stocksRouter);

app.use((_req, res) => res.status(404).json({ error: "not_found", message: "Route not found" }));
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`[api-gateway] listening on :${config.port} -> ${config.dataServiceUrl}`);
});
