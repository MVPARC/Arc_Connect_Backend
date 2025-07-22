const mongoose = require("mongoose");
const Report = require("../model/reportModel");
const UAParser = require("ua-parser-js");

// Track Email Open
exports.trackOpen = async (req, res) => {
  try {
    const { campaignId, recipientId } = req.params;
    console.log("📩 [Open Tracking] Request Received:", { campaignId, recipientId });

    const campaignObjectId = new mongoose.Types.ObjectId(campaignId);
    const userId = req.user?._id || null; // If authentication is used

    // Send tracking pixel immediately
    res.set("Content-Type", "image/gif");
    res.send(Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64"));

    const parser = new UAParser(req.headers["user-agent"]);
    const userAgentInfo = parser.getResult();
    const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    const enhancedData = {
      recipientId,
      timestamp: new Date(),
      ipAddress,
      userAgent: req.headers["user-agent"],
      device: {
        type: userAgentInfo.device.type || "desktop",
        vendor: userAgentInfo.device.vendor || null,
        model: userAgentInfo.device.model || null,
      },
      browser: userAgentInfo.browser,
      os: userAgentInfo.os,
    };

    const result = await Report.findOneAndUpdate(
      { campaignId: campaignObjectId, ...(userId && { user: userId }) },
      {
        $inc: { "opens.total": 1 },
        $push: { "opens.details": enhancedData },
        $setOnInsert: { createdAt: new Date(), totalSent: 0, campaignId: campaignObjectId, user: userId }
      },
      { new: true, upsert: true }
    );

    console.log("✅ [Open Tracking] Updated Report:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("❌ [Open Tracking] Error:", error);
  }
};

// Track Link Click
exports.trackClick = async (req, res) => {
  try {
    const { campaignId, recipientId, linkId } = req.params;
    const { url } = req.query;
    console.log("🔗 [Click Tracking] Request Received:", { campaignId, recipientId, linkId, url });

    const campaignObjectId = new mongoose.Types.ObjectId(campaignId);
    const userId = req.user?._id || null;

    const parser = new UAParser(req.headers["user-agent"]);
    const userAgentInfo = parser.getResult();
    const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    const enhancedData = {
      recipientId,
      timestamp: new Date(),
      url,
      linkId,
      ipAddress,
      userAgent: req.headers["user-agent"],
      device: {
        type: userAgentInfo.device.type || "desktop",
        vendor: userAgentInfo.device.vendor || null,
        model: userAgentInfo.device.model || null,
      },
      browser: userAgentInfo.browser,
      os: userAgentInfo.os,
    };

    const result = await Report.findOneAndUpdate(
      { campaignId: campaignObjectId, ...(userId && { user: userId }) },
      {
        $inc: { "clicks.total": 1 },
        $push: { "clicks.details": enhancedData },
        $setOnInsert: { createdAt: new Date(), totalSent: 0, campaignId: campaignObjectId, user: userId }
      },
      { new: true, upsert: true }
    );

    console.log("✅ [Click Tracking] Updated Report:", JSON.stringify(result, null, 2));

    if (url) {
      return res.redirect(url);
    }
    return res.status(404).send("URL not found");
  } catch (error) {
    console.error("❌ [Click Tracking] Error:", error);
    if (req.query.url) return res.redirect(req.query.url);
    res.status(500).send("Error tracking click");
  }
};
