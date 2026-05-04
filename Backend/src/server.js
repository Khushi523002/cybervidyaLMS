import { app } from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";

await connectDatabase();

app.listen(env.port, () => {
  console.log(`Cyber Vidya API running on http://127.0.0.1:${env.port}`);
});
