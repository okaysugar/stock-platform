export const config = {
  port: parseInt(process.env.PORT ?? "3000", 10),
  dataServiceUrl: process.env.DATA_SERVICE_URL ?? "http://data-service:8000",
  requestTimeoutMs: parseInt(process.env.DATA_SERVICE_TIMEOUT_MS ?? "15000", 10),
};
