// // src/controllers/tracking.controller.js
// const Report = require("../model/reportModel");

// exports.trackOpen = async (req, res) => {
//   const { campaignId, recipientId } = req.params;

//   try {
//     await Report.findOneAndUpdate(
//       { campaignId },
//       {
//         $inc: { "opens.total": 1 },
//         $push: {
//           "opens.details": {
//             recipientId,
//             timestamp: new Date(),
//           },
//         },
//       },
//       { upsert: true }
//     );

//     // Send a 1x1 transparent GIF
//     const img = Buffer.from(
//       "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
//       "base64"
//     );
//     res.writeHead(200, {
//       "Content-Type": "image/gif",
//       "Content-Length": img.length,
//     });
//     res.end(img);
//   } catch (error) {
//     console.error("Error tracking email open:", error);
//     res.status(500).end();
//   }
// };

// Update your tracking controller
exports.trackOpen = async (req, res) => {
  try {
    const { campaignId, recipientId } = req.params;

    // New: Capture user agent data
    const userAgent = req.headers["user-agent"];
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Parsed user agent info
    const deviceInfo = parseUserAgent(userAgent); // You'll need a parser library

    await Report.findOneAndUpdate(
      { campaignId },
      {
        $inc: { "opens.total": 1 },
        $push: {
          "opens.details": {
            recipientId,
            timestamp: new Date(),
            userAgent,
            ipAddress,
            device: deviceInfo.device,
            browser: deviceInfo.browser,
            os: deviceInfo.os,
          },
        },
      },
      { new: true }
    );

    // Return the tracking pixel
    res.set("Content-Type", "image/gif");
    res.send(
      Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        "base64"
      )
    );
  } catch (error) {
    console.error("Error tracking open:", error);
    res.status(500).send("Error tracking");
  }
};
