const express = require("express");
const cors = require("cors");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const passport = require("./config/googleAuth");
const { dbConnect } = require("./config/dbconnection");

const app = express();

// ✅ Swagger Setup
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./utils/swagger");

app.get("/api/api-docs/swagger.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

app.use("/api/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Winston Logger with Loki
const winston = require("winston");
const LokiTransport = require("winston-loki");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "email-service" },
  transports: [
    new LokiTransport({
      host: process.env.LOKI_URL || "http://localhost:3100",
      labels: { app: "email-service", env: process.env.NODE_ENV || "dev" },
      json: true,
      batching: true,
      interval: 5,
    }),
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});

// Prometheus Setup
const client = require("prom-client");
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDurationMicroseconds = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.1, 0.3, 0.5, 1, 1.5, 2, 3],
});
register.registerMetric(httpRequestDurationMicroseconds);

// Global Middleware
app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: "500mb" }));
app.use(bodyParser.json({ limit: "500mb" }));
app.use(
  bodyParser.urlencoded({
    limit: "500mb",
    extended: true,
    parameterLimit: 50000000,
  })
);
app.use(passport.initialize());

// Prometheus + Logging Middleware
app.use((req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on("finish", () => {
    end({
      method: req.method,
      route: req.originalUrl,
      status_code: res.statusCode,
    });
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode}`, {
      method: req.method,
      route: req.originalUrl,
      status: res.statusCode,
    });
  });
  next();
});

// Prometheus Metrics Endpoint
app.get("/metrics", async (req, res) => {
  res.setHeader("Content-Type", register.contentType);
  res.send(await register.metrics());
});

// Root & Health Check
app.get("/", (req, res) => {
  res.send("Backend is running! API is live.");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// Import Routes
const campaignRoutes = require("./routes/campaignRoutes");
const emailTemplateRoutes = require("./routes/emailTemplateRoute");
const reportRoutes = require("./routes/reportRoute");
const trackingRoutes = require("./routes/trackingRoute");
const emailRoutes = require("./routes/emailRoutes");
const authRoutes = require("./routes/authRoute");
const recipientRoutes = require("./routes/recipientRoutes");
const imageRoutes = require("./routes/imageRoutes");
const arcDeckRoutes = require("./routes/arcDeckRoutes");

// Use Routes
app.use("/api/auth", authRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/email-templates", emailTemplateRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/recipients", recipientRoutes);
app.use("/api/images", imageRoutes);
app.use("/api/v1/arcdeck", arcDeckRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).send("Sorry, that route doesn't exist.");
});

// Error Handler
app.use((err, req, res, next) => {
  logger.error("Internal Server Error", { error: err.stack });
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

// Start Server
const startServer = async () => {
  try {
    await dbConnect();
    const PORT = process.env.PORT || 8081;
    app.listen(PORT, () => {
      logger.info(`Server running on port: ${PORT}`);
      console.log(`Your server is running on port: ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to connect to the database", {
      error: error.message,
    });
    console.error("Failed to connect to the database", error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
