/*const express = require("express");
const router = express.Router();

// Import all routes
const authRoute = require("./authRoute");
const analyticsRoute = require("./analyticsRoute");
const arcDeckRoutes = require("./arcDeckRoutes");
const campaignRoutes = require("./campaignRoutes");
const emailRoutes = require("./emailRoutes");
const trackingRoute = require("./trackingRoute");
const subscriptionRoute = require("./subscriptionRoute");
const reportRoute = require("./reportRoute");
const recipientRoutes = require("./recipientRoutes");
const imageRoutes = require("./imageRoutes");
const emailTemplateRoute = require("./emailTemplateRoute");

const authCheck = require("../middleware/authCheck");
const mountRoutesWithAuth = require("../middleware/mountRoutesWithAuth");

// Inject 'mvparc' organization into every request
router.use((req, res, next) => {
  console.log("Injected mvparc org");
  req.org = "mvparc";
  next();
});

// Health check
router.get("/ping", (req, res) => {
  console.log("Handling /ping route");
  res.json({ message: "mvparc route is alive", org: req.org });
});

// ✅ Public routes
router.use("/auth", authRoute); 
router.use("/tracking", trackingRoute); // e.g., open/click tracking, bounce webhooks   //done

// ✅ Protected routes (require token)
router.use("/analytics", mountRoutesWithAuth(analyticsRoute, authCheck));
router.use("/arcDeck", mountRoutesWithAuth(arcDeckRoutes, authCheck));
router.use("/campaigns", mountRoutesWithAuth(campaignRoutes, authCheck));
router.use("/emails", mountRoutesWithAuth(emailRoutes, authCheck));
router.use("/subscriptions", mountRoutesWithAuth(subscriptionRoute, authCheck)); //done
router.use("/reports", mountRoutesWithAuth(reportRoute, authCheck));             //done
router.use("/recipients", mountRoutesWithAuth(recipientRoutes, authCheck));
router.use("/images", mountRoutesWithAuth(imageRoutes, authCheck));
router.use("/templates", mountRoutesWithAuth(emailTemplateRoute, authCheck));


module.exports = router;*/
