export function errorHandler(error, _req, res, _next) {
  const status = error.status || 500;
  // Always log the full error for debugging
  console.error("[ERROR]", error.message, error.stack);
  const message = error.message || "Something went wrong.";
  res.status(status).json({ message });
}