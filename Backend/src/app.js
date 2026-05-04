import cors from "cors";
import express from "express";
import path from "path";

import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { notFound } from "./middlewares/notFound.js";
import { apiRouter } from "./routes/index.js";

export const app = express();

app.use(cors({
  origin: env.clientOrigin === "*" ? true : env.clientOrigin,
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));

// Serve uploaded POC files
app.use("/uploads/poc", express.static(path.resolve("uploads/poc")));

app.get("/api/health/", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", apiRouter);
app.use(notFound);
app.use(errorHandler);
