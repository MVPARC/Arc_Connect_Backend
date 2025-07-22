// // src/routes/tracking.routes.js
// const express = require("express");
// const router = express.Router();
// const trackingController = require("../controller/tracker");

// router.get("/:campaignId/:recipientId", trackingController.trackOpen);

// module.exports = router;

const express = require("express");
const router = express.Router();
const trackerController = require("../controller/tracker");

// Existing route for tracking opens
router.get("/:campaignId/:recipientId", trackerController.trackOpen);

// New route for tracking clicks
router.get(
  "/click/:campaignId/:recipientId/:linkId",
  trackerController.trackClick
);

module.exports = router;
