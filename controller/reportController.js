// const Report = require("../model/reportModel");
// exports.getReportForCampaign = async (req, res) => {
//   try {
//     const report = await Report.findOne({
//       campaignId: req.params.campaignId,
//     }).populate("campaignId");
//     if (!report) {
//       return res
//         .status(404)
//         .json({ message: "Report not found for this campaign" });
//     }
//     res.json(report);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.updateReport = async (req, res) => {
//   try {
//     const report = await Report.findOne({ campaignId: req.params.campaignId });
//     if (!report) {
//       return res
//         .status(404)
//         .json({ message: "Report not found for this campaign" });
//     }

//     if (req.body.opens) report.opens += 1;
//     if (req.body.clicks) report.clicks += 1;

//     await report.save();
//     res.json(report);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.getAllReports = async (req, res) => {
//   try {
//     const reports = await Report.find().populate("campaignId");
//     res.json(reports);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.getOpenDetailsByCampaign = async (req, res) => {
//   try {
//     const report = await Report.findOne({ campaignId: req.params.campaignId });
//     if (!report) {
//       return res
//         .status(404)
//         .json({ message: "Report not found for this campaign" });
//     }

//     const openCounts = report.opens.details.reduce((acc, curr) => {
//       acc[curr.recipientId] = (acc[curr.recipientId] || 0) + 1;
//       return acc;
//     }, {});

//     res.json({
//       campaignId: report.campaignId,
//       totalOpens: report.opens.total,
//       openDetails: openCounts,
//     });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// src/controllers/reportController.js
const Report = require("../model/reportModel");
const Campaign = require("../model/campaignModel");

exports.getAllReports = async (req, res) => {
  try {
    const reports = await Report.find({ user: req.user._id }).populate({
      path: "campaignId",
      match: { user: req.user._id },
    });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getReportForCampaign = async (req, res) => {
  try {
    // First verify that the campaign belongs to the user
    const campaign = await Campaign.findOne({
      _id: req.params.campaignId,
      user: req.user._id,
    });

    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    const report = await Report.findOne({
      campaignId: req.params.campaignId,
      user: req.user._id,
    }).populate({
      path: "campaignId",
      match: { user: req.user._id },
    });

    if (!report) {
      return res
        .status(404)
        .json({ message: "Report not found for this campaign" });
    }

    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateReport = async (req, res) => {
  try {
    // First verify that the campaign belongs to the user
    const campaign = await Campaign.findOne({
      _id: req.params.campaignId,
      user: req.user._id,
    });

    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    const report = await Report.findOne({
      campaignId: req.params.campaignId,
      user: req.user._id,
    });

    if (!report) {
      return res
        .status(404)
        .json({ message: "Report not found for this campaign" });
    }

    // Update opens
    if (req.body.opens) {
      report.opens.total += 1;
      if (req.body.recipientId) {
        report.opens.details.push({
          recipientId: req.body.recipientId,
          timestamp: new Date(),
        });
      }
    }

    // Update clicks
    if (req.body.clicks) {
      report.clicks.total += 1;
      if (req.body.recipientId && req.body.url) {
        report.clicks.details.push({
          recipientId: req.body.recipientId,
          timestamp: new Date(),
          url: req.body.url,
        });
      }
    }

    await report.save();
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getOpenDetailsByCampaign = async (req, res) => {
  try {
    // First verify that the campaign belongs to the user
    const campaign = await Campaign.findOne({
      _id: req.params.campaignId,
      user: req.user._id,
    });

    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    const report = await Report.findOne({
      campaignId: req.params.campaignId,
      user: req.user._id,
    });

    if (!report) {
      return res
        .status(404)
        .json({ message: "Report not found for this campaign" });
    }

    const openCounts = report.opens.details.reduce((acc, curr) => {
      acc[curr.recipientId] = (acc[curr.recipientId] || 0) + 1;
      return acc;
    }, {});

    res.json({
      campaignId: report.campaignId,
      totalOpens: report.opens.total,
      openDetails: openCounts,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Helper function to create a new report for a campaign
exports.createReportForCampaign = async (campaignId, userId) => {
  try {
    const report = new Report({
      campaignId,
      user: userId,
      totalSent: 0,
      opens: { total: 0, details: [] },
      clicks: { total: 0, details: [] },
    });

    return await report.save();
  } catch (error) {
    console.error("Error creating report:", error);
    throw error;
  }
};

module.exports = exports;
