

const Report = require("../model/reportModel");
const UAParser = require("ua-parser-js");

exports.trackOpen = async (req, res) => {
  try {
    const { campaignId, recipientId } = req.params;

    // Return tracking pixel immediately
    res.set("Content-Type", "image/gif");
    res.send(
      Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        "base64"
      )
    );

    // Parse user agent
    const parser = new UAParser(req.headers["user-agent"]);
    const userAgentInfo = parser.getResult();

    // Get IP address (with fallbacks)
    const ipAddress =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.connection.socket.remoteAddress;

    // Create enhanced analytics data
    const enhancedData = {
      recipientId,
      timestamp: new Date(),
      ipAddress: ipAddress,
      userAgent: req.headers["user-agent"],
      device: {
        type: userAgentInfo.device.type || "desktop",
        vendor: userAgentInfo.device.vendor,
        model: userAgentInfo.device.model,
      },
      browser: {
        name: userAgentInfo.browser.name,
        version: userAgentInfo.browser.version,
      },
      os: {
        name: userAgentInfo.os.name,
        version: userAgentInfo.os.version,
      },
    };

    // Update or create report with enhanced data
    await Report.findOneAndUpdate(
      { campaignId },
      {
        $inc: { "opens.total": 1 },
        $push: { "opens.details": enhancedData },
      },
      {
        new: true,
        upsert: true,
        runValidators: false,
      }
    );
  } catch (error) {
    console.error("Error tracking open:", error);
  }
};

exports.trackClick = async (req, res) => {
  try {
    const { campaignId, recipientId, linkId } = req.params;
    const { url } = req.query;

    // Parse user agent
    const parser = new UAParser(req.headers["user-agent"]);
    const userAgentInfo = parser.getResult();

    // Get IP address (with fallbacks)
    const ipAddress =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.connection.socket.remoteAddress;

    // Create enhanced analytics data
    const enhancedData = {
      recipientId,
      timestamp: new Date(),
      url,
      linkId,
      ipAddress: ipAddress,
      userAgent: req.headers["user-agent"],
      device: {
        type: userAgentInfo.device.type || "desktop",
        vendor: userAgentInfo.device.vendor,
        model: userAgentInfo.device.model,
      },
      browser: {
        name: userAgentInfo.browser.name,
        version: userAgentInfo.browser.version,
      },
      os: {
        name: userAgentInfo.os.name,
        version: userAgentInfo.os.version,
      },
    };

    // Update report in background
    Report.findOneAndUpdate(
      { campaignId },
      {
        $inc: { "clicks.total": 1 },
        $push: { "clicks.details": enhancedData },
      },
      {
        new: true,
        upsert: true,
        runValidators: false,
      }
    ).exec();

    // Redirect immediately to the target URL
    if (url) {
      return res.redirect(url);
    } else {
      return res.status(404).send("URL not found");
    }
  } catch (error) {
    console.error("Error tracking click:", error);
    // In case of error, still try to redirect if possible
    if (req.query.url) {
      return res.redirect(req.query.url);
    }
    res.status(500).send("Error tracking click");
  }
};
