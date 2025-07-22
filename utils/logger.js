const { createLogger, format, transports } = require("winston");
const LokiTransport = require("winston-loki");

const logger = createLogger({
  format: format.json(),
  transports: [
    new LokiTransport({
      host: "http://localhost:3100", // Your Loki container URL
      labels: { app: "arc_connect_backend", env: "dev" },
      json: true,
    }),
  ],
});

module.exports = logger;
