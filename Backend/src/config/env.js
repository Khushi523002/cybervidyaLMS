import "dotenv/config";

export const env = {
  port: Number(process.env.PORT || 8000),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cyber_vidya_lms",
  authSecret: process.env.AUTH_SECRET || "dev-only-change-me",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
};
