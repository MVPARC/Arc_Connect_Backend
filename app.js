const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const { dbConnect } = require("./config/dbconnection");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const passport = require("./config/googleAuth");

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
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

const startServer = async () => {
  try {
    await dbConnect();
    const PORT = process.env.PORT || 8081;
    app.listen(PORT, () => {
      console.log(`Your server is running on port: ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to the database", error);
    process.exit(1);
  }
};

startServer();

// Export the Express API
module.exports = app;
