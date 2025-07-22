// src/controller/reportController.js
const Report = require("../model/reportModel");
const mongoose = require("mongoose");

/**
 * @desc Dashboard analytics (overview for user)
 * @route GET /reports/dashboard/analytics
 */
exports.getDashboardAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;

    const analytics = await Report.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalCampaigns: { $sum: 1 },
          totalSent: { $sum: "$totalSent" },
          totalOpens: { $sum: "$opens.total" },
          totalClicks: { $sum: "$clicks.total" },
        },
      },
      {
        $project: {
          _id: 0,
          totalCampaigns: 1,
          totalSent: 1,
          totalOpens: 1,
          totalClicks: 1,
          openRate: {
            $cond: [
              { $eq: ["$totalSent", 0] },
              0,
              { $round: [{ $divide: ["$totalOpens", "$totalSent"] }, 2] },
            ],
          },
          clickRate: {
            $cond: [
              { $eq: ["$totalSent", 0] },
              0,
              { $round: [{ $divide: ["$totalClicks", "$totalSent"] }, 2] },
            ],
          },
        },
      },
    ]);

    return res.status(200).json(analytics[0] || {});
  } catch (error) {
    console.error("Error in getDashboardAnalytics:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

/**
 * @desc Get report for a specific campaign
 * @route GET /reports/:campaignId
 */
exports.getReportForCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const org = req.organization; // From Auth middleware

    const report = await Report.findOne({
      campaignId,
      organization: org,
    }).lean();

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    return res.status(200).json(report);
  } catch (error) {
    console.error("Error in getReportForCampaign:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

/**
 * @desc Get open details for a specific campaign
 * @route GET /reports/:campaignId/opens
 */
exports.getOpenDetailsByCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;

    // Don't force ObjectId if campaignId is stored as string
    const query = { campaignId };

    const report = await Report.findOne(query, {
      "opens.details": 1,
      _id: 0
    }).lean();

    if (!report || !report.opens || !report.opens.details || report.opens.details.length === 0) {
      return res.status(200).json([]); // Return empty array if no data
    }

    return res.status(200).json(report.opens.details);
  } catch (error) {
    console.error("Error in getOpenDetailsByCampaign:", error);
    res.status(500).json({ message: "Server Error" });
  }
};


exports.getAllReports = async (req, res) => {
  try {
    const org = req.organization; // From Auth middleware
    const reports = await Report.find({ organization: org })
      .sort({ createdAt: -1 })
      .select("campaignId totalSent opens.total clicks.total createdAt")
      .populate("campaignId", "name subject"); // Optional: campaign info

    return res.status(200).json(reports);
  } catch (error) {
    console.error("Error in getAllReports:", error);
    res.status(500).json({ message: "Server Error" });
  }
};



/**
 * @desc Get click analytics for a specific campaign
 * @route GET /reports/:campaignId/analytics/clicks
 */
exports.getCampaignClickAnalytics = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const org = req.organization;

    const pipeline = [
      {
        $match: {
          campaignId: new mongoose.Types.ObjectId(campaignId),
          organization: org
        }
      },
      { $unwind: { path: "$clicks.details", preserveNullAndEmptyArrays: false } }, // removes empty arrays
      {
        $group: {
          _id: "$clicks.details.url",
          totalClicks: { $sum: 1 },
          devices: { $addToSet: "$clicks.details.device.type" },
          browsers: { $addToSet: "$clicks.details.browser.name" }
        }
      },
      { $sort: { totalClicks: -1 } }
    ];

    const clickAnalytics = await Report.aggregate(pipeline);

    if (!clickAnalytics.length) {
      return res.status(200).json({ message: "No click data available" });
    }

    return res.status(200).json(clickAnalytics);
  } catch (error) {
    console.error("Error in getCampaignClickAnalytics:", error);
    res.status(500).json({ message: "Server Error" });
  }
};


/**
 * @desc Update a report (e.g., system updates after new opens/clicks)
 * @route PUT /reports/:campaignId
 */
exports.updateReport = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const org = req.organization; // From Auth middleware
    const updateData = req.body;

    const updatedReport = await Report.findOneAndUpdate(
      { campaignId, organization: org },
      { $set: updateData },
      { new: true }
    );

    if (!updatedReport) {
      return res.status(404).json({ message: "Report not found" });
    }

    return res.status(200).json(updatedReport);
  } catch (error) {
    console.error("Error in updateReport:", error);
    res.status(500).json({ message: "Server Error" });
  }
};




/*const Report = require("../model/reportModel");
const Campaign = require("../model/campaignModel");

exports.getAllReports = async (req, res) => {
  try {
    // Find all campaigns that belong to the user
    const userCampaigns = await Campaign.find({ user: req.user._id });
    const campaignIds = userCampaigns.map((campaign) => campaign._id);

    // Find reports for those campaigns
    const reports = await Report.find({
      campaignId: { $in: campaignIds },
    }).populate({
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

    // Find report by campaign ID only, not filtering by user
    const report = await Report.findOne({
      campaignId: req.params.campaignId,
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

    // Find report by campaign ID only
    const report = await Report.findOne({
      campaignId: req.params.campaignId,
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

    // Find report by campaign ID only
    const report = await Report.findOne({
      campaignId: req.params.campaignId,
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

// For the tracking endpoint, we can simplify it to:
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

    // Update or create report without user field
    await Report.findOneAndUpdate(
      { campaignId },
      {
        $inc: { "opens.total": 1 },
        $push: { "opens.details": { recipientId, timestamp: new Date() } },
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

exports.getCampaignClickAnalytics = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { filters, sortBy = "totalClicks", sortOrder = "desc" } = req.query;

    // Parse the filters JSON if provided
    let filterObj = {};
    if (filters) {
      try {
        filterObj = JSON.parse(filters);
      } catch (error) {
        return res
          .status(400)
          .json({ message: "Invalid filter format. Expected JSON." });
      }
    }

    // Verify campaign belongs to user
    const campaign = await Campaign.findOne({
      _id: campaignId,
      user: req.user._id,
    });

    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    // Get report
    const report = await Report.findOne({ campaignId });

    if (!report || !report.clicks.details.length) {
      return res
        .status(404)
        .json({ message: "No click data found for this campaign" });
    }

    // Start with all clicks
    let filteredClicks = report.clicks.details;

    // Apply date filters
    if (filterObj.dateRange) {
      if (filterObj.dateRange.startDate) {
        const start = new Date(filterObj.dateRange.startDate);
        filteredClicks = filteredClicks.filter(
          (click) => new Date(click.timestamp) >= start
        );
      }

      if (filterObj.dateRange.endDate) {
        const end = new Date(filterObj.dateRange.endDate);
        filteredClicks = filteredClicks.filter(
          (click) => new Date(click.timestamp) <= end
        );
      }
    }

    // Apply device filters
    if (filterObj.device) {
      // Contains operation
      if (
        filterObj.device.contains &&
        Array.isArray(filterObj.device.contains)
      ) {
        filteredClicks = filteredClicks.filter(
          (click) =>
            click.device.type &&
            filterObj.device.contains.some(
              (d) => click.device.type.toLowerCase() === d.toLowerCase()
            )
        );
      }

      // Equals operation
      if (filterObj.device.equals) {
        filteredClicks = filteredClicks.filter(
          (click) =>
            click.device.type &&
            click.device.type.toLowerCase() ===
              filterObj.device.equals.toLowerCase()
        );
      }
    }

    // Apply browser filters
    if (filterObj.browser) {
      // Contains operation
      if (
        filterObj.browser.contains &&
        Array.isArray(filterObj.browser.contains)
      ) {
        filteredClicks = filteredClicks.filter(
          (click) =>
            click.browser.name &&
            filterObj.browser.contains.some((b) =>
              click.browser.name.toLowerCase().includes(b.toLowerCase())
            )
        );
      }

      // Equals operation
      if (filterObj.browser.equals) {
        filteredClicks = filteredClicks.filter(
          (click) =>
            click.browser.name &&
            click.browser.name.toLowerCase() ===
              filterObj.browser.equals.toLowerCase()
        );
      }
    }

    // Apply OS filters
    if (filterObj.os) {
      // Contains operation
      if (filterObj.os.contains && Array.isArray(filterObj.os.contains)) {
        filteredClicks = filteredClicks.filter(
          (click) =>
            click.os.name &&
            filterObj.os.contains.some((o) =>
              click.os.name.toLowerCase().includes(o.toLowerCase())
            )
        );
      }

      // Equals operation
      if (filterObj.os.equals) {
        filteredClicks = filteredClicks.filter(
          (click) =>
            click.os.name &&
            click.os.name.toLowerCase() === filterObj.os.equals.toLowerCase()
        );
      }
    }

    // Apply URL filters
    if (filterObj.url) {
      // Contains operation
      if (filterObj.url.contains && Array.isArray(filterObj.url.contains)) {
        filteredClicks = filteredClicks.filter(
          (click) =>
            click.url &&
            filterObj.url.contains.some((u) =>
              click.url.toLowerCase().includes(u.toLowerCase())
            )
        );
      }

      // Equals operation
      if (filterObj.url.equals) {
        filteredClicks = filteredClicks.filter(
          (click) =>
            click.url &&
            click.url.toLowerCase() === filterObj.url.equals.toLowerCase()
        );
      }
    }

    // Apply recipient filters
    if (filterObj.recipient) {
      // Contains operation
      if (
        filterObj.recipient.contains &&
        Array.isArray(filterObj.recipient.contains)
      ) {
        filteredClicks = filteredClicks.filter((click) =>
          filterObj.recipient.contains.includes(click.recipientId)
        );
      }

      // Equals operation
      if (filterObj.recipient.equals) {
        filteredClicks = filteredClicks.filter(
          (click) => click.recipientId === filterObj.recipient.equals
        );
      }
    }

    // Aggregate by recipientId and URL
    const recipientUrlClicks = {};
    const urlMetrics = {};
    const deviceMetrics = { desktop: 0, mobile: 0, tablet: 0, other: 0 };
    const browserMetrics = {};
    const osMetrics = {};

    filteredClicks.forEach((click) => {
      // Recipient-URL aggregate
      const key = `${click.recipientId}|${click.url}`;
      if (!recipientUrlClicks[key]) {
        recipientUrlClicks[key] = {
          recipientId: click.recipientId,
          url: click.url,
          totalClicks: 0,
          firstClick: click.timestamp,
          lastClick: click.timestamp,
        };
      }

      recipientUrlClicks[key].totalClicks++;

      if (
        new Date(click.timestamp) < new Date(recipientUrlClicks[key].firstClick)
      ) {
        recipientUrlClicks[key].firstClick = click.timestamp;
      }

      if (
        new Date(click.timestamp) > new Date(recipientUrlClicks[key].lastClick)
      ) {
        recipientUrlClicks[key].lastClick = click.timestamp;
      }

      // URL metrics
      if (!urlMetrics[click.url]) {
        urlMetrics[click.url] = {
          url: click.url,
          totalClicks: 0,
          uniqueRecipients: new Set(),
        };
      }

      urlMetrics[click.url].totalClicks++;
      urlMetrics[click.url].uniqueRecipients.add(click.recipientId);

      // Device metrics
      const deviceType = click.device.type || "other";
      deviceMetrics[deviceType] = (deviceMetrics[deviceType] || 0) + 1;

      // Browser metrics
      const browserName = click.browser.name || "unknown";
      browserMetrics[browserName] = (browserMetrics[browserName] || 0) + 1;

      // OS metrics
      const osName = click.os.name || "unknown";
      osMetrics[osName] = (osMetrics[osName] || 0) + 1;
    });

    // Process URL metrics to convert Sets to counts
    Object.keys(urlMetrics).forEach((url) => {
      urlMetrics[url].uniqueRecipients = urlMetrics[url].uniqueRecipients.size;
    });

    // Convert to arrays for sorting
    const recipientStats = Object.values(recipientUrlClicks);
    const urlStats = Object.values(urlMetrics);

    // Sort based on sortBy parameter
    const sortValue = sortOrder.toLowerCase() === "asc" ? 1 : -1;

    if (sortBy === "totalClicks") {
      recipientStats.sort(
        (a, b) => (a.totalClicks - b.totalClicks) * sortValue
      );
      urlStats.sort((a, b) => (a.totalClicks - b.totalClicks) * sortValue);
    } else if (sortBy === "url") {
      recipientStats.sort((a, b) => a.url.localeCompare(b.url) * sortValue);
      urlStats.sort((a, b) => a.url.localeCompare(b.url) * sortValue);
    } else if (sortBy === "recipientId") {
      recipientStats.sort(
        (a, b) => a.recipientId.localeCompare(b.recipientId) * sortValue
      );
    } else if (sortBy === "uniqueRecipients") {
      urlStats.sort(
        (a, b) => (a.uniqueRecipients - b.uniqueRecipients) * sortValue
      );
    }

    // Prepare recipient details if specific recipients were requested
    let recipientDetails = [];
    if (
      filterObj.recipient &&
      (filterObj.recipient.equals ||
        (filterObj.recipient.contains &&
          filterObj.recipient.contains.length === 1))
    ) {
      const targetRecipientId =
        filterObj.recipient.equals || filterObj.recipient.contains[0];
      const recipientClicks = filteredClicks.filter(
        (click) => click.recipientId === targetRecipientId
      );

      if (recipientClicks.length > 0) {
        recipientDetails = [
          {
            recipientId: targetRecipientId,
            totalClicks: recipientClicks.length,
            uniqueUrls: new Set(recipientClicks.map((click) => click.url)).size,
            clickTimeline: recipientClicks
              .map((click) => ({
                timestamp: click.timestamp,
                url: click.url,
                device: click.device,
                browser: click.browser,
                os: click.os,
              }))
              .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
          },
        ];
      }
    }

    // Build the response
    const response = {
      campaignId,
      totalClicks: filteredClicks.length,
      uniqueUrls: urlStats.length,
      uniqueRecipients: new Set(
        filteredClicks.map((click) => click.recipientId)
      ).size,
      urlStats,
      recipientStats,
      deviceMetrics,
      browserMetrics,
      osMetrics,
      appliedFilters: filterObj,
    };

    // Add recipient details if available
    if (recipientDetails.length > 0) {
      response.recipientDetails = recipientDetails;
    }

    res.json(response);
  } catch (err) {
    console.error("Error generating click analytics:", err);
    res.status(500).json({ message: err.message });
  }
};

// Add to reportController.js
exports.getDashboardAnalytics = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      campaignIds,
      groupBy = "day", // day, week, month options
    } = req.query;

    // Parse campaign IDs if provided, or get all user's campaigns
    let campaigns = [];
    if (campaignIds) {
      const campaignIdArray = Array.isArray(campaignIds)
        ? campaignIds
        : campaignIds.split(",");
      campaigns = await Campaign.find({
        _id: { $in: campaignIdArray },
        user: req.user._id,
      });
    } else {
      campaigns = await Campaign.find({ user: req.user._id });
    }

    if (!campaigns.length) {
      return res.status(200).json({
        message: "No campaigns found",
        summary: getEmptySummary(),
        timeSeriesData: [],
        deviceStats: [],
        browserStats: [],
        osStats: [],
        linkPerformance: [],
        campaignComparison: [],
      });
    }

    // Get campaign IDs
    const campaignIdObjects = campaigns.map((campaign) => campaign._id);

    // Fetch all relevant reports
    const reports = await Report.find({
      campaignId: { $in: campaignIdObjects },
    });

    // Process date range
    const dateFilter = {};
    if (startDate) {
      const parsedStartDate = new Date(startDate);
      if (!isNaN(parsedStartDate.getTime())) {
        dateFilter.startDate = parsedStartDate;
      }
    }

    if (endDate) {
      const parsedEndDate = new Date(endDate);
      if (!isNaN(parsedEndDate.getTime())) {
        // Set to end of day for the end date
        parsedEndDate.setHours(23, 59, 59, 999);
        dateFilter.endDate = parsedEndDate;
      }
    }

    // Validate groupBy parameter
    const validGroupings = ["day", "week", "month"];
    const normalizedGroupBy = validGroupings.includes(groupBy.toLowerCase())
      ? groupBy.toLowerCase()
      : "day";

    // Aggregate and calculate metrics
    const analytics = {
      summary: calculateSummaryMetrics(campaigns, reports, dateFilter),
      timeSeriesData: generateTimeSeriesData(
        reports,
        dateFilter,
        normalizedGroupBy
      ),
      deviceStats: calculateDeviceStats(reports, dateFilter),
      browserStats: calculateBrowserStats(reports, dateFilter),
      osStats: calculateOsStats(reports, dateFilter),
      linkPerformance: calculateLinkPerformance(reports, dateFilter),
      campaignComparison: generateCampaignComparison(
        campaigns,
        reports,
        dateFilter
      ),
    };

    res.json(analytics);
  } catch (err) {
    console.error("Error generating dashboard analytics:", err);
    res.status(500).json({
      message: "An error occurred while generating analytics",
      error: err.message,
    });
  }
};

// Helper functions for calculations with improved error handling
function getEmptySummary() {
  return {
    totalSent: 0,
    totalOpens: 0,
    totalClicks: 0,
    uniqueOpens: 0,
    uniqueClicks: 0,
    openRate: "0.00",
    clickRate: "0.00",
    clickToOpenRate: "0.00",
  };
}

function calculateSummaryMetrics(campaigns, reports, dateFilter) {
  if (!campaigns.length || !reports.length) {
    return getEmptySummary();
  }

  let totalSent = 0;
  let totalOpens = 0;
  let totalClicks = 0;
  let uniqueOpens = new Set();
  let uniqueClicks = new Set();

  // Calculate total sent by summing completed campaigns' recipient counts
  campaigns.forEach((campaign) => {
    // Only count campaigns that have actually been sent (status completed or sending)
    if (campaign.status === "completed" || campaign.status === "sending") {
      totalSent += campaign.progress?.totalRecipients || 0;
    }
  });

  reports.forEach((report) => {
    if (!report || !report.opens || !report.clicks) return;

    // Safely access details arrays
    const opensDetails = Array.isArray(report.opens.details)
      ? report.opens.details
      : [];
    const clicksDetails = Array.isArray(report.clicks.details)
      ? report.clicks.details
      : [];

    // Filter opens by date if needed
    const filteredOpens =
      dateFilter.startDate || dateFilter.endDate
        ? opensDetails.filter((open) => {
            if (!open || !open.timestamp) return false;

            const openDate = new Date(open.timestamp);
            if (isNaN(openDate.getTime())) return false;

            return (
              (!dateFilter.startDate || openDate >= dateFilter.startDate) &&
              (!dateFilter.endDate || openDate <= dateFilter.endDate)
            );
          })
        : opensDetails;

    // Filter clicks by date if needed
    const filteredClicks =
      dateFilter.startDate || dateFilter.endDate
        ? clicksDetails.filter((click) => {
            if (!click || !click.timestamp) return false;

            const clickDate = new Date(click.timestamp);
            if (isNaN(clickDate.getTime())) return false;

            return (
              (!dateFilter.startDate || clickDate >= dateFilter.startDate) &&
              (!dateFilter.endDate || clickDate <= dateFilter.endDate)
            );
          })
        : clicksDetails;

    totalOpens += filteredOpens.length;
    totalClicks += filteredClicks.length;

    // Track unique opens and clicks, ensuring we have valid recipientId
    filteredOpens.forEach((open) => {
      if (open && open.recipientId) uniqueOpens.add(open.recipientId);
    });

    filteredClicks.forEach((click) => {
      if (click && click.recipientId) uniqueClicks.add(click.recipientId);
    });
  });

  // Find true number of unique opens by comparing with actual recipients
  const campaignRecipients = new Set();
  campaigns.forEach((campaign) => {
    if (Array.isArray(campaign.recipients)) {
      campaign.recipients.forEach((recipient) => {
        if (recipient && recipient.id) {
          campaignRecipients.add(recipient.id);
        }
      });
    }
  });

  // Filter unique opens to only include actual campaign recipients
  const validUniqueOpens = new Set();
  uniqueOpens.forEach((recipientId) => {
    if (campaignRecipients.has(recipientId)) {
      validUniqueOpens.add(recipientId);
    }
  });

  // Same for clicks
  const validUniqueClicks = new Set();
  uniqueClicks.forEach((recipientId) => {
    if (campaignRecipients.has(recipientId)) {
      validUniqueClicks.add(recipientId);
    }
  });

  const uniqueOpensCount = validUniqueOpens.size;
  const uniqueClicksCount = validUniqueClicks.size;

  // Calculate rates with safeguards
  let openRate = "0.00";
  if (totalSent > 0) {
    // Ensure open rate never exceeds 100%
    const calculatedOpenRate = Math.min(
      100,
      (uniqueOpensCount / totalSent) * 100
    );
    openRate = calculatedOpenRate.toFixed(2);
  }

  let clickRate = "0.00";
  if (totalSent > 0) {
    // Ensure click rate never exceeds 100%
    const calculatedClickRate = Math.min(
      100,
      (uniqueClicksCount / totalSent) * 100
    );
    clickRate = calculatedClickRate.toFixed(2);
  }

  let clickToOpenRate = "0.00";
  if (uniqueOpensCount > 0) {
    // Ensure click-to-open rate never exceeds 100%
    const calculatedCTOR = Math.min(
      100,
      (uniqueClicksCount / uniqueOpensCount) * 100
    );
    clickToOpenRate = calculatedCTOR.toFixed(2);
  }

  return {
    totalSent,
    totalOpens,
    totalClicks,
    uniqueOpens: uniqueOpensCount,
    uniqueClicks: uniqueClicksCount,
    openRate,
    clickRate,
    clickToOpenRate,
  };
}

function generateTimeSeriesData(reports, dateFilter, groupBy) {
  // Create a map to store data points by date
  const timeData = new Map();

  // Add date handling for empty data sets
  if (!reports.length) {
    // Return at least some time periods for empty data
    const today = new Date();
    const periods = [];

    if (groupBy === "day") {
      // Return last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = formatDateByGrouping(date, groupBy);
        periods.push({ date: dateKey, opens: 0, clicks: 0 });
      }
    } else if (groupBy === "week") {
      // Return last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i * 7);
        const dateKey = formatDateByGrouping(date, groupBy);
        periods.push({ date: dateKey, opens: 0, clicks: 0 });
      }
    } else if (groupBy === "month") {
      // Return last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = new Date(today);
        date.setMonth(date.getMonth() - i);
        const dateKey = formatDateByGrouping(date, groupBy);
        periods.push({ date: dateKey, opens: 0, clicks: 0 });
      }
    }

    return periods;
  }

  // Process all opens and clicks
  reports.forEach((report) => {
    if (!report) return;

    // Safely access opens details
    const opensDetails = Array.isArray(report.opens?.details)
      ? report.opens.details
      : [];

    // Process opens
    opensDetails.forEach((open) => {
      if (!open || !open.timestamp) return;

      try {
        const openDate = new Date(open.timestamp);
        if (isNaN(openDate.getTime())) return;

        // Skip if outside date filter
        if (
          (dateFilter.startDate && openDate < dateFilter.startDate) ||
          (dateFilter.endDate && openDate > dateFilter.endDate)
        ) {
          return;
        }

        // Format date based on grouping
        const dateKey = formatDateByGrouping(openDate, groupBy);

        if (!timeData.has(dateKey)) {
          timeData.set(dateKey, { date: dateKey, opens: 0, clicks: 0 });
        }

        const dateData = timeData.get(dateKey);
        dateData.opens++;
      } catch (error) {
        console.error("Error processing open timestamp:", error.message);
      }
    });

    // Safely access clicks details
    const clicksDetails = Array.isArray(report.clicks?.details)
      ? report.clicks.details
      : [];

    // Process clicks
    clicksDetails.forEach((click) => {
      if (!click || !click.timestamp) return;

      try {
        const clickDate = new Date(click.timestamp);
        if (isNaN(clickDate.getTime())) return;

        // Skip if outside date filter
        if (
          (dateFilter.startDate && clickDate < dateFilter.startDate) ||
          (dateFilter.endDate && clickDate > dateFilter.endDate)
        ) {
          return;
        }

        // Format date based on grouping
        const dateKey = formatDateByGrouping(clickDate, groupBy);

        if (!timeData.has(dateKey)) {
          timeData.set(dateKey, { date: dateKey, opens: 0, clicks: 0 });
        }

        const dateData = timeData.get(dateKey);
        dateData.clicks++;
      } catch (error) {
        console.error("Error processing click timestamp:", error.message);
      }
    });
  });

  // Convert map to array and sort by date
  return Array.from(timeData.values()).sort((a, b) => {
    // For day and month format, simple string comparison works
    if (groupBy === "day" || groupBy === "month") {
      return a.date.localeCompare(b.date);
    }

    // For week format, parse the week number
    if (groupBy === "week") {
      const [yearA, weekA] = a.date.split("-W");
      const [yearB, weekB] = b.date.split("-W");

      if (yearA !== yearB) {
        return parseInt(yearA) - parseInt(yearB);
      }

      return parseInt(weekA) - parseInt(weekB);
    }

    // Fallback to string comparison
    return a.date.localeCompare(b.date);
  });
}

function formatDateByGrouping(date, groupBy) {
  try {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    switch (groupBy.toLowerCase()) {
      case "month":
        return `${year}-${month}`;
      case "week":
        // Get ISO week number
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        const weekNum = Math.ceil(
          (pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7
        );
        return `${year}-W${String(weekNum).padStart(2, "0")}`;
      case "day":
      default:
        return `${year}-${month}-${day}`;
    }
  } catch (error) {
    console.error("Error formatting date:", error.message);
    // Return a safe fallback
    return "unknown-date";
  }
}

function calculateDeviceStats(reports, dateFilter) {
  const devices = {};

  if (!reports || !reports.length) {
    return [];
  }

  reports.forEach((report) => {
    if (!report) return;

    // Process opens
    if (Array.isArray(report.opens?.details)) {
      report.opens.details.forEach((open) => {
        if (!open || !open.timestamp) return;

        try {
          const interactionDate = new Date(open.timestamp);
          if (isNaN(interactionDate.getTime())) return;

          // Skip if outside date filter
          if (
            (dateFilter.startDate && interactionDate < dateFilter.startDate) ||
            (dateFilter.endDate && interactionDate > dateFilter.endDate)
          ) {
            return;
          }

          const deviceType = open.device?.type || "unknown";
          devices[deviceType] = (devices[deviceType] || 0) + 1;
        } catch (error) {
          console.error("Error processing device stat:", error.message);
        }
      });
    }

    // Process clicks
    if (Array.isArray(report.clicks?.details)) {
      report.clicks.details.forEach((click) => {
        if (!click || !click.timestamp) return;

        try {
          const interactionDate = new Date(click.timestamp);
          if (isNaN(interactionDate.getTime())) return;

          // Skip if outside date filter
          if (
            (dateFilter.startDate && interactionDate < dateFilter.startDate) ||
            (dateFilter.endDate && interactionDate > dateFilter.endDate)
          ) {
            return;
          }

          const deviceType = click.device?.type || "unknown";
          devices[deviceType] = (devices[deviceType] || 0) + 1;
        } catch (error) {
          console.error("Error processing device stat:", error.message);
        }
      });
    }
  });

  return Object.entries(devices)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

function calculateBrowserStats(reports, dateFilter) {
  const browsers = {};

  if (!reports || !reports.length) {
    return [];
  }

  reports.forEach((report) => {
    if (!report) return;

    // Process both opens and clicks
    const interactions = [
      ...(Array.isArray(report.opens?.details) ? report.opens.details : []),
      ...(Array.isArray(report.clicks?.details) ? report.clicks.details : []),
    ];

    interactions.forEach((interaction) => {
      if (!interaction || !interaction.timestamp) return;

      try {
        const interactionDate = new Date(interaction.timestamp);
        if (isNaN(interactionDate.getTime())) return;

        // Skip if outside date filter
        if (
          (dateFilter.startDate && interactionDate < dateFilter.startDate) ||
          (dateFilter.endDate && interactionDate > dateFilter.endDate)
        ) {
          return;
        }

        const browserName = interaction.browser?.name || "unknown";
        browsers[browserName] = (browsers[browserName] || 0) + 1;
      } catch (error) {
        console.error("Error processing browser stat:", error.message);
      }
    });
  });

  return Object.entries(browsers)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function calculateOsStats(reports, dateFilter) {
  const operatingSystems = {};

  if (!reports || !reports.length) {
    return [];
  }

  reports.forEach((report) => {
    if (!report) return;

    // Process both opens and clicks
    const interactions = [
      ...(Array.isArray(report.opens?.details) ? report.opens.details : []),
      ...(Array.isArray(report.clicks?.details) ? report.clicks.details : []),
    ];

    interactions.forEach((interaction) => {
      if (!interaction || !interaction.timestamp) return;

      try {
        const interactionDate = new Date(interaction.timestamp);
        if (isNaN(interactionDate.getTime())) return;

        // Skip if outside date filter
        if (
          (dateFilter.startDate && interactionDate < dateFilter.startDate) ||
          (dateFilter.endDate && interactionDate > dateFilter.endDate)
        ) {
          return;
        }

        const osName = interaction.os?.name || "unknown";
        operatingSystems[osName] = (operatingSystems[osName] || 0) + 1;
      } catch (error) {
        console.error("Error processing OS stat:", error.message);
      }
    });
  });

  return Object.entries(operatingSystems)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function calculateLinkPerformance(reports, dateFilter) {
  const linkStats = {};

  if (!reports || !reports.length) {
    return [];
  }

  reports.forEach((report) => {
    if (!report || !Array.isArray(report.clicks?.details)) return;

    report.clicks.details.forEach((click) => {
      if (!click || !click.timestamp || !click.url) return;

      try {
        const clickDate = new Date(click.timestamp);
        if (isNaN(clickDate.getTime())) return;

        // Skip if outside date filter
        if (
          (dateFilter.startDate && clickDate < dateFilter.startDate) ||
          (dateFilter.endDate && clickDate > dateFilter.endDate)
        ) {
          return;
        }

        const url = click.url;

        if (!linkStats[url]) {
          linkStats[url] = {
            url,
            totalClicks: 0,
            uniqueClickers: new Set(),
          };
        }

        linkStats[url].totalClicks++;
        if (click.recipientId) {
          linkStats[url].uniqueClickers.add(click.recipientId);
        }
      } catch (error) {
        console.error("Error processing link stat:", error.message);
      }
    });
  });

  // Convert Sets to counts
  return Object.values(linkStats)
    .map((stat) => ({
      url: stat.url,
      totalClicks: stat.totalClicks,
      uniqueClickers: stat.uniqueClickers.size,
    }))
    .sort((a, b) => b.totalClicks - a.totalClicks);
}

function generateCampaignComparison(campaigns, reports, dateFilter) {
  if (!campaigns || !campaigns.length) {
    return [];
  }

  return campaigns
    .map((campaign) => {
      // Default values for campaign with no report
      const defaultCampaignData = {
        id: campaign._id,
        name: campaign.name || "Unnamed Campaign",
        sent: campaign.progress?.totalRecipients || 0,
        opens: 0,
        clicks: 0,
        openRate: "0.00",
        clickRate: "0.00",
      };

      // If campaign hasn't been sent yet, return default data
      if (
        !campaign.status ||
        campaign.status === "draft" ||
        !campaign.progress?.totalRecipients
      ) {
        return defaultCampaignData;
      }

      // Find corresponding report
      const report = reports.find(
        (r) =>
          r &&
          r.campaignId &&
          r.campaignId.toString() === campaign._id.toString()
      );

      if (!report) {
        return defaultCampaignData;
      }

      // Get sent count
      const sent = campaign.progress?.totalRecipients || 0;

      // Collect recipient IDs from campaign
      const campaignRecipientIds = new Set();
      if (Array.isArray(campaign.recipients)) {
        campaign.recipients.forEach((recipient) => {
          if (recipient && recipient.id) {
            campaignRecipientIds.add(recipient.id);
          }
        });
      }

      // Filter opens by date and valid recipients
      const filteredOpens = Array.isArray(report.opens?.details)
        ? report.opens.details.filter((open) => {
            if (!open || !open.timestamp || !open.recipientId) return false;

            // Check if this is a valid recipient
            if (!campaignRecipientIds.has(open.recipientId)) return false;

            // Check date filter if needed
            if (dateFilter.startDate || dateFilter.endDate) {
              const openDate = new Date(open.timestamp);
              if (isNaN(openDate.getTime())) return false;

              return (
                (!dateFilter.startDate || openDate >= dateFilter.startDate) &&
                (!dateFilter.endDate || openDate <= dateFilter.endDate)
              );
            }

            return true;
          })
        : [];

      // Filter clicks by date and valid recipients
      const filteredClicks = Array.isArray(report.clicks?.details)
        ? report.clicks.details.filter((click) => {
            if (!click || !click.timestamp || !click.recipientId) return false;

            // Check if this is a valid recipient
            if (!campaignRecipientIds.has(click.recipientId)) return false;

            // Check date filter if needed
            if (dateFilter.startDate || dateFilter.endDate) {
              const clickDate = new Date(click.timestamp);
              if (isNaN(clickDate.getTime())) return false;

              return (
                (!dateFilter.startDate || clickDate >= dateFilter.startDate) &&
                (!dateFilter.endDate || clickDate <= dateFilter.endDate)
              );
            }

            return true;
          })
        : [];

      // Count unique opens and clicks
      const uniqueOpeners = new Set(
        filteredOpens.map((open) => open.recipientId)
      );
      const uniqueClickers = new Set(
        filteredClicks.map((click) => click.recipientId)
      );

      // Calculate rates with safeguards
      let openRate = "0.00";
      if (sent > 0 && uniqueOpeners.size > 0) {
        // Cap open rate at 100%
        const calculatedOpenRate = Math.min(
          100,
          (uniqueOpeners.size / sent) * 100
        );
        openRate = calculatedOpenRate.toFixed(2);
      }

      let clickRate = "0.00";
      if (sent > 0 && uniqueClickers.size > 0) {
        // Cap click rate at 100%
        const calculatedClickRate = Math.min(
          100,
          (uniqueClickers.size / sent) * 100
        );
        clickRate = calculatedClickRate.toFixed(2);
      }

      return {
        id: campaign._id,
        name: campaign.name || "Unnamed Campaign",
        sent: sent,
        opens: uniqueOpeners.size,
        clicks: uniqueClickers.size,
        openRate,
        clickRate,
      };
    })
    .sort((a, b) => {
      // Sort by openRate (numeric comparison, not string)
      return parseFloat(b.openRate) - parseFloat(a.openRate);
    });
}

// Helper function - we can leave this as is if you're still using it elsewhere
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

module.exports = exports;*/
