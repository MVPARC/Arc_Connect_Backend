const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const { dbConnect } = require("./config/dbconnection");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const passport = require("./config/googleAuth");

//  Import Winston Logger
const winston = require("winston");
const LokiTransport = require("winston-loki");
try {
  const swaggerUi = require('swagger-ui-express');
  const swaggerSpec = require('./utils/swagger');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
} catch (err) {
  console.error("Swagger failed to load:", err.message);
}



//  Import Prometheus Client
const client = require("prom-client");

// Winston Logger with Loki Transport
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
      interval: 5, // send logs every 5s
    }),
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});

// Prometheus Metrics Setup
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDurationMicroseconds = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.1, 0.3, 0.5, 1, 1.5, 2, 3], // response time buckets
});

register.registerMetric(httpRequestDurationMicroseconds);

//  Middleware for request duration
app.use((req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on("finish", () => {
    end({ method: req.method, route: req.originalUrl, status_code: res.statusCode });
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode}`, {
      method: req.method,
      route: req.originalUrl,
      status: res.statusCode,
    });
  });
  next();
});

//  Metrics endpoint
app.get("/metrics", async (req, res) => {
  res.setHeader("Content-Type", register.contentType);
  res.send(await register.metrics());
});

// Import routes
const campaignRoutes = require("./routes/campaignRoutes");
const emailTemplateRoutes = require("./routes/emailTemplateRoute");
const reportRoutes = require("./routes/reportRoute");
const trackingRoutes = require("./routes/trackingRoute");
const emailRoutes = require("./routes/emailRoutes");
const authRoutes = require("./routes/authRoute");
const recipientRoutes = require("./routes/recipientRoutes");
const imageRoutes = require("./routes/imageRoutes");
const arcDeckRoutes = require("./routes/arcDeckRoutes");

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

// Root and Health Check Routes
app.get("/", (req, res) => {
  res.send("Backend is running! API is live.");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// Application Routes
app.use("/api/auth", authRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/email-templates", emailTemplateRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/recipients", recipientRoutes);
app.use("/api/images", imageRoutes);
app.use("/api/v1/arcdeck", arcDeckRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).send("Sorry, that route doesn't exist.");
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error("Internal Server Error", { error: err.stack });
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

const startServer = async () => {
  try {
    await dbConnect();
    const PORT = process.env.PORT || 8081;
    app.listen(PORT, () => {
      logger.info(`Server running on port: ${PORT}`);
      console.log(`Your server is running on port: ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to connect to the database", { error: error.message });
    console.error("Failed to connect to the database", error);
    process.exit(1);
  }
};

startServer();

// Export the Express API
module.exports = app;
