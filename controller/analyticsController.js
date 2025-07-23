// src/controllers/analyticsController.js
const Report = require("../model/reportModel");
const Campaign = require("../model/campaignModel");
const mongoose = require("mongoose");

/**
 * Campaign-specific analytics functions
 */

// Get summary metrics for a specific campaign
exports.getCampaignSummary = async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    // Verify user has access to this campaign
    const campaign = await Campaign.findOne({
      _id: campaignId,
      user: req.user._id,
    });
    
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }
    
    const report = await Report.findOne({ 
      campaignId, 
      user: req.user._id 
    });
    
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    
    // Prepare summary data
    const summary = {
      campaignId: campaign._id,
      campaignName: campaign.name,
      totalSent: report.totalSent,
      // Delivery metrics
      delivered: report.totalSent - report.bounces.total,
      bounced: report.bounces.total,
      deliveryRate: report.deliveryRate,
      // Engagement metrics
      opens: {
        total: report.opens.total,
        unique: report.opens.uniqueCount,
        rate: report.openRate
      },
      clicks: {
        total: report.clicks.total,
        unique: report.clicks.uniqueCount,
        rate: report.clickRate,
        ctr: report.clickToOpenRate // Click-to-open rate
      },
      // Negative metrics
      unsubscribes: {
        total: report.unsubscribes.total,
        rate: report.unsubscribeRate
      },
      complaints: {
        total: report.complaints.total,
        rate: report.complaints.total / report.totalSent * 100
      },
      // Timing
      sentDate: campaign.completedAt || campaign.scheduledDate,
      lastUpdate: report.lastUpdated
    };
    
    res.json(summary);
  } catch (error) {
    console.error("Error getting campaign summary:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get detailed open data for a campaign
exports.getCampaignOpens = async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    // Verify campaign ownership
    const campaign = await Campaign.findOne({
      _id: campaignId,
      user: req.user._id,
    });
    
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }
    
    const report = await Report.findOne({ 
      campaignId, 
      user: req.user._id 
    });
    
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    
    // Process opens data
    const opensByRecipient = {};
    report.opens.details.forEach(open => {
      if (!opensByRecipient[open.recipientId]) {
        opensByRecipient[open.recipientId] = {
          recipientId: open.recipientId,
          count: 0,
          firstOpen: null,
          lastOpen: null,
          openTimes: []
        };
      }
      
      const recipient = opensByRecipient[open.recipientId];
      recipient.count++;
      const openTime = new Date(open.timestamp);
      
      if (!recipient.firstOpen || openTime < new Date(recipient.firstOpen)) {
        recipient.firstOpen = openTime;
      }
      
      if (!recipient.lastOpen || openTime > new Date(recipient.lastOpen)) {
        recipient.lastOpen = openTime;
      }
      
      recipient.openTimes.push({
        timestamp: openTime,
        device: open.device,
        platform: open.platform,
        location: open.geo.country
      });
    });
    
    // Format opens for response
    const opensData = {
      totalOpens: report.opens.total,
      uniqueOpens: report.opens.uniqueCount,
      openRate: report.openRate,
      byCountry: report.opens.byCountry,
      byDevice: report.opens.byDevice,
      byBrowser: report.opens.byBrowser,
      byTimeOfDay: report.opens.byTimeOfDay,
      byDayOfWeek: report.opens.byDayOfWeek,
      byPlatform: {},  // Aggregate platform data
      openTrend: {}, // Aggregate open trend data by hour
      recipients: Object.values(opensByRecipient)
    };
    
    // Calculate platform distribution
    report.opens.details.forEach(open => {
      if (open.platform) {
        opensData.byPlatform[open.platform] = 
          (opensData.byPlatform[open.platform] || 0) + 1;
      }
    });
    
    // Calculate open trend by hour
    report.opens.details.forEach(open => {
      const hour = new Date(open.timestamp).getHours();
      opensData.openTrend[hour] = (opensData.openTrend[hour] || 0) + 1;
    });
    
    res.json(opensData);
  } catch (error) {
    console.error("Error getting campaign opens:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get detailed click data for a campaign
exports.getCampaignClicks = async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    // Verify campaign ownership
    const campaign = await Campaign.findOne({
      _id: campaignId,
      user: req.user._id,
    });
    
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }
    
    const report = await Report.findOne({ 
      campaignId, 
      user: req.user._id 
    });
    
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    
    // Process clicks data
    const clicksByLink = {};
    const clicksByRecipient = {};
    
    report.clicks.details.forEach(click => {
      // Group by link
      if (!clicksByLink[click.url]) {
        clicksByLink[click.url] = {
          url: click.url,
          linkText: click.linkText || "Unknown",
          linkId: click.linkId,
          count: 0,
          uniqueClickers: new Set(),
          clicks: []
        };
      }
      
      clicksByLink[click.url].count++;
      clicksByLink[click.url].uniqueClickers.add(click.recipientId);
      clicksByLink[click.url].clicks.push({
        timestamp: click.timestamp,
        recipient: click.recipientId,
        device: click.device,
        geo: click.geo
      });
      
      // Group by recipient
      if (!clicksByRecipient[click.recipientId]) {
        clicksByRecipient[click.recipientId] = {
          recipientId: click.recipientId,
          count: 0,
          firstClick: null,
          lastClick: null,
          clickedLinks: new Set(),
          clicks: []
        };
      }
      
      const recipient = clicksByRecipient[click.recipientId];
      recipient.count++;
      recipient.clickedLinks.add(click.url);
      
      const clickTime = new Date(click.timestamp);
      if (!recipient.firstClick || clickTime < new Date(recipient.firstClick)) {
        recipient.firstClick = clickTime;
      }
      
      if (!recipient.lastClick || clickTime > new Date(recipient.lastClick)) {
        recipient.lastClick = clickTime;
      }
      
      recipient.clicks.push({
        timestamp: clickTime,
        url: click.url,
        linkText: click.linkText,
        device: click.device,
        location: click.geo.country
      });
    });
    
    // Format for response
    // Convert Sets to arrays for JSON serialization
    Object.values(clicksByLink).forEach(link => {
      link.uniqueClickers = [...link.uniqueClickers];
      link.uniqueClickersCount = link.uniqueClickers.length;
    });
    
    Object.values(clicksByRecipient).forEach(recipient => {
      recipient.clickedLinks = [...recipient.clickedLinks];
      recipient.uniqueLinksCount = recipient.clickedLinks.length;
    });
    
    const clicksData = {
      totalClicks: report.clicks.total,
      uniqueClicks: report.clicks.uniqueCount,
      clickRate: report.clickRate,
      clickToOpenRate: report.clickToOpenRate,
      byCountry: report.clicks.byCountry,
      byDevice: report.clicks.byDevice,
      byTimeOfDay: report.clicks.byTimeOfDay,
      byDayOfWeek: report.clicks.byDayOfWeek,
      byUrl: report.clicks.byUrl,
      links: Object.values(clicksByLink),
      recipients: Object.values(clicksByRecipient)
    };
    
    res.json(clicksData);
  } catch (error) {
    console.error("Error getting campaign clicks:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get geographical analytics for a campaign
exports.getCampaignGeoAnalytics = async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    // Verify campaign ownership
    const campaign = await Campaign.findOne({
      _id: campaignId,
      user: req.user._id,
    });
    
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }
    
    const report = await Report.findOne({ 
      campaignId, 
      user: req.user._id 
    });
    
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    
    // Process geo data from opens and clicks
    const countryData = new Map();
    const regionData = new Map();
    const cityData = new Map();
    
    // Process opens
    report.opens.details.forEach(open => {
      if (open.geo) {
        // Country data
        const country = open.geo.country || 'Unknown';
        if (!countryData.has(country)) {
          countryData.set(country, { 
            name: country, 
            opens: 0, 
            clicks: 0,
            uniqueOpens: new Set(),
            uniqueClicks: new Set()
          });
        }
        countryData.get(country).opens++;
        countryData.get(country).uniqueOpens.add(open.recipientId);
        
        // Region data
        if (open.geo.region) {
          const region = `${country}: ${open.geo.region}`;
          if (!regionData.has(region)) {
            regionData.set(region, { 
              name: region, 
              opens: 0, 
              clicks: 0,
              uniqueOpens: new Set(),
              uniqueClicks: new Set()
            });
          }
          regionData.get(region).opens++;
          regionData.get(region).uniqueOpens.add(open.recipientId);
        }
        
        // City data
        if (open.geo.city) {
          const city = `${country}: ${open.geo.city}`;
          if (!cityData.has(city)) {
            cityData.set(city, { 
              name: city, 
              opens: 0, 
              clicks: 0,
              uniqueOpens: new Set(),
              uniqueClicks: new Set(),
              coordinates: open.geo.coordinates
            });
          }
          cityData.get(city).opens++;
          cityData.get(city).uniqueOpens.add(open.recipientId);
        }
      }
    });
    
    // Process clicks
    report.clicks.details.forEach(click => {
      if (click.geo) {
        // Country data
        const country = click.geo.country || 'Unknown';
        if (!countryData.has(country)) {
          countryData.set(country, { 
            name: country, 
            opens: 0, 
            clicks: 0,
            uniqueOpens: new Set(),
            uniqueClicks: new Set()
          });
        }
        countryData.get(country).clicks++;
        countryData.get(country).uniqueClicks.add(click.recipientId);
        
        // Region data
        if (click.geo.region) {
          const region = `${country}: ${click.geo.region}`;
          if (!regionData.has(region)) {
            regionData.set(region, { 
              name: region, 
              opens: 0, 
              clicks: 0,
              uniqueOpens: new Set(),
              uniqueClicks: new Set()
            });
          }
          regionData.get(region).clicks++;
          regionData.get(region).uniqueClicks.add(click.recipientId);
        }
        
        // City data
        if (click.geo.city) {
          const city = `${country}: ${click.geo.city}`;
          if (!cityData.has(city)) {
            cityData.set(city, { 
              name: city, 
              opens: 0, 
              clicks: 0,
              uniqueOpens: new Set(),
              uniqueClicks: new Set(),
              coordinates: click.geo.coordinates
            });
          }
          cityData.get(city).clicks++;
          cityData.get(city).uniqueClicks.add(click.recipientId);
        }
      }
    });
    
    // Convert Sets to counts for response
    const formatGeoData = (data) => {
      return Array.from(data.values()).map(item => ({
        name: item.name,
        opens: item.opens,
        clicks: item.clicks,
        uniqueOpens: item.uniqueOpens.size,
        uniqueClicks: item.uniqueClicks.size,
        coordinates: item.coordinates
      }));
    };
    
    const geoData = {
      countries: formatGeoData(countryData),
      regions: formatGeoData(regionData),
      cities: formatGeoData(cityData),
      // Provide aggregated country data from the report
      opensByCountry: report.opens.byCountry,
      clicksByCountry: report.clicks.byCountry
    };
    
    res.json(geoData);
  } catch (error) {
    console.error("Error getting geo analytics:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get device analytics for a campaign
exports.getCampaignDeviceAnalytics = async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    // Verify campaign ownership
    const campaign = await Campaign.findOne({
      _id: campaignId,
      user: req.user._id,
    });
    
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }
    
    const report = await Report.findOne({ 
      campaignId, 
      user: req.user._id 
    });
    
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    
    // Prepare device analytics
    const deviceData = {
      deviceType: report.opens.byDevice,
      browser: report.opens.byBrowser,
      operatingSystems: {},
      emailClients: {},
      // Calculate engagement by device type
      engagement: {
        desktop: { opens: 0, clicks: 0, ctr: 0 },
        mobile: { opens: 0, clicks: 0, ctr: 0 },
        tablet: { opens: 0, clicks: 0, ctr: 0 },
        unknown: { opens: 0, clicks: 0, ctr: 0 }
      }
    };
    
    // Process OS and email client data
    report.opens.details.forEach(open => {
      // OS data
      if (open.device && open.device.os) {
        const os = open.device.os;
        deviceData.operatingSystems[os] = (deviceData.operatingSystems[os] || 0) + 1;
      }
      
      // Email client data
      if (open.platform) {
        deviceData.emailClients[open.platform] = (deviceData.emailClients[open.platform] || 0) + 1;
      }
      
      // Add to engagement metrics
      const deviceType = (open.device && open.device.type) || 'unknown';
      deviceData.engagement[deviceType].opens++;
    });
    
    // Process clicks by device
    report.clicks.details.forEach(click => {
      const deviceType = (click.device && click.device.type) || 'unknown';
      deviceData.engagement[deviceType].clicks++;
    });
    
    // Calculate CTR (Click-Through Rate) for each device type
    Object.keys(deviceData.engagement).forEach(deviceType => {
      const device = deviceData.engagement[deviceType];
      device.ctr = device.opens > 0 ? (device.clicks / device.opens) * 100 : 0;
    });
    
    res.json(deviceData);
  } catch (error) {
    console.error("Error getting device analytics:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get timing analytics for a campaign
exports.getCampaignTimingAnalytics = async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    // Verify campaign ownership
    const campaign = await Campaign.findOne({
      _id: campaignId,
      user: req.user._id,
    });
    
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }
    
    const report = await Report.findOne({ 
      campaignId, 
      user: req.user._id 
    });
    
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    
    // Prepare time-based analytics
    const timeData = {
      byHourOfDay: new Array(24).fill(0),
      byDayOfWeek: report.opens.byDayOfWeek,
      byTimeOfDay: report.opens.byTimeOfDay,
      firstResponse: {},
      responseTimeDistribution: {
        "under1hour": 0,
        "1to3hours": 0,
        "3to6hours": 0,
        "6to12hours": 0,
        "12to24hours": 0,
        "over24hours": 0
      },
      // Daily trend data
      dailyTrend: report.dailyStats
    };
    
    // Calculate opens by hour of day
    report.opens.details.forEach(open => {
      const hour = new Date(open.timestamp).getHours();
      timeData.byHourOfDay[hour]++;
    });
    
    // Calculate response times if we have a campaign sent time
    if (campaign.completedAt) {
      const sentTime = new Date(campaign.completedAt);
      
      // Track first open by recipient
      const firstOpenByRecipient = {};
      
      report.opens.details.forEach(open => {
        const openTime = new Date(open.timestamp);
        
        // Only track if this is the first open for this recipient
        if (!firstOpenByRecipient[open.recipientId] || 
            openTime < firstOpenByRecipient[open.recipientId]) {
          firstOpenByRecipient[open.recipientId] = openTime;
          
          // Calculate response time in hours
          const responseTimeMs = openTime - sentTime;
          const responseTimeHours = responseTimeMs / (1000 * 60 * 60);
          
          // Categorize response time
          if (responseTimeHours < 1) {
            timeData.responseTimeDistribution["under1hour"]++;
          } else if (responseTimeHours < 3) {
            timeData.responseTimeDistribution["1to3hours"]++;
          } else if (responseTimeHours < 6) {
            timeData.responseTimeDistribution["3to6hours"]++;
          } else if (responseTimeHours < 12) {
            timeData.responseTimeDistribution["6to12hours"]++;
          } else if (responseTimeHours < 24) {
            timeData.responseTimeDistribution["12to24hours"]++;
          } else {
            timeData.responseTimeDistribution["over24hours"]++;
          }
        }
      });
      
      // Calculate first response metrics
      if (Object.keys(firstOpenByRecipient).length > 0) {
        const responseTimesMs = Object.values(firstOpenByRecipient).map(time => time - sentTime);
        
        timeData.firstResponse = {
          median: calculateMedian(responseTimesMs) / (1000 * 60 * 60), // Convert to hours
          average: calculateAverage(responseTimesMs) / (1000 * 60 * 60), // Convert to hours
          min: Math.min(...responseTimesMs) / (1000 * 60 * 60),
          max: Math.max(...responseTimesMs) / (1000 * 60 * 60)
        };
      }
    }
    
    res.json(timeData);
  } catch (error) {
    console.error("Error getting timing analytics:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get recipient-level analytics for a campaign
exports.getCampaignRecipientAnalytics = async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    // Verify campaign ownership
    const campaign = await Campaign.findOne({
      _id: campaignId,
      user: req.user._id,
    });
    
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }
    
    const report = await Report.findOne({ 
      campaignId, 
      user: req.user._id 
    });
    
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    
    // Get all recipients from the campaign
    const allRecipients = campaign.recipients || [];
    
    // Create a map of recipient analytics
    const recipientAnalytics = {};
    
    // Initialize with all recipients
    allRecipients.forEach(recipient => {
      recipientAnalytics[recipient.id] = {
        id: recipient.id,
        email: recipient.email,
        name: recipient.name,
        opened: false,
        openCount: 0,
        clicked: false,
        clickCount: 0,
        clickedLinks: [],
        bounced: false,
        unsubscribed: false,
        complained: false,
        firstOpenTime: null,
        firstClickTime: null,
        lastActive: null
      };
    });
    
    // Process opens
    report.opens.details.forEach(open => {
      if (recipientAnalytics[open.recipientId]) {
        const recipient = recipientAnalytics[open.recipientId];
        recipient.opened = true;
        recipient.openCount++;
        
        const openTime = new Date(open.timestamp);
        
        // Track first open
        if (!recipient.firstOpenTime || openTime < new Date(recipient.firstOpenTime)) {
          recipient.firstOpenTime = openTime;
        }
        
        // Update last active time
        if (!recipient.lastActive || openTime > new Date(recipient.lastActive)) {
          recipient.lastActive = openTime;
        }
      }
    });
    
    // Process clicks
    report.clicks.details.forEach(click => {
      if (recipientAnalytics[click.recipientId]) {
        const recipient = recipientAnalytics[click.recipientId];
        recipient.clicked = true;
        recipient.clickCount++;
        
        // Add clicked link if not already in the list
        if (!recipient.clickedLinks.some(link => link.url === click.url)) {
          recipient.clickedLinks.push({
            url: click.url,
            text: click.linkText,
            timestamp: click.timestamp
          });
        }
        
        const clickTime = new Date(click.timestamp);
        
        // Track first click
        if (!recipient.firstClickTime || clickTime < new Date(recipient.firstClickTime)) {
          recipient.firstClickTime = clickTime;
        }
        
        // Update last active time
        if (!recipient.lastActive || clickTime > new Date(recipient.lastActive)) {
          recipient.lastActive = clickTime;
        }
      }
    });
    
    // Process bounces
    report.bounces.details.forEach(bounce => {
      if (recipientAnalytics[bounce.recipientId]) {
        recipientAnalytics[bounce.recipientId].bounced = true;
      }
    });
    
    // Process unsubscribes
    report.unsubscribes.details.forEach(unsub => {
      if (recipientAnalytics[unsub.recipientId]) {
        recipientAnalytics[unsub.recipientId].unsubscribed = true;
      }
    });
    
    // Process complaints
    report.complaints.details.forEach(complaint => {
      if (recipientAnalytics[complaint.recipientId]) {
        recipientAnalytics[complaint.recipientId].complained = true;
      }
    });
    
    // Calculate engagement metrics
    const metrics = {
      total: allRecipients.length,
      opened: Object.values(recipientAnalytics).filter(r => r.opened).length,
      clicked: Object.values(recipientAnalytics).filter(r => r.clicked).length,
      bounced: Object.values(recipientAnalytics).filter(r => r.bounced).length,
      unsubscribed: Object.values(recipientAnalytics).filter(r => r.unsubscribed).length,
      complained: Object.values(recipientAnalytics).filter(r => r.complained).length,
      inactive: Object.values(recipientAnalytics).filter(r => !r.opened && !r.clicked && !r.bounced).length
    };
    
    res.json({
      metrics,
      recipients: Object.values(recipientAnalytics)
    });
  } catch (error) {
    console.error("Error getting recipient analytics:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get link-specific analytics for a campaign
exports.getCampaignLinkAnalytics = async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    // Verify campaign ownership
    const campaign = await Campaign.findOne({
      _id: campaignId,
      user: req.user._id,
    });
    
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }
    
    const report = await Report.findOne({ 
      campaignId, 
      user: req.user._id 
    });
    
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    
    // Analyze links
    const linkAnalytics = {};
    
    report.clicks.details.forEach(click => {
      const url = click.url;
      
      if (!linkAnalytics[url]) {
        linkAnalytics[url] = {
          url,
          linkId: click.linkId,
          linkText: click.linkText || 'Unknown',
          totalClicks: 0,
          uniqueClicks: new Set(),
          clicksByDevice: {},
          clicksByCountry: {},
          clicksByHour: new Array(24).fill(0),
          firstClick: null,
          lastClick: null
        };
      }
      
      const link = linkAnalytics[url];
      link.totalClicks++;
      link.uniqueClicks.add(click.recipientId);
      
      // Track clicks by device
      const deviceType = (click.device && click.device.type) || 'unknown';
      link.clicksByDevice[deviceType] = (link.clicksByDevice[deviceType] || 0) + 1;
      
      // Track clicks by country
      const country = (click.geo && click.geo.country) || 'Unknown';
      link.clicksByCountry[country] = (link.clicksByCountry[country] || 0) + 1;
      
      // Track clicks by hour
    // Track clicks by hour
      const hour = new Date(click.timestamp).getHours();
      link.clicksByHour[hour]++;
      
      // Track first and last click
      const clickTime = new Date(click.timestamp);
      if (!link.firstClick || clickTime < new Date(link.firstClick)) {
        link.firstClick = clickTime;
      }
      
      if (!link.lastClick || clickTime > new Date(link.lastClick)) {
        link.lastClick = clickTime;
      }
    });
    
    // Convert Sets to counts for JSON serialization
    Object.values(linkAnalytics).forEach(link => {
      link.uniqueClicksCount = link.uniqueClicks.size;
      link.uniqueClicks = [...link.uniqueClicks];
    });
    
    res.json({
      totalLinks: Object.keys(linkAnalytics).length,
      totalClicks: report.clicks.total,
      uniqueClicks: report.clicks.uniqueCount,
      links: Object.values(linkAnalytics)
    });
  } catch (error) {
    console.error("Error getting link analytics:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get bounce analytics for a campaign
exports.getCampaignBounceAnalytics = async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    // Verify campaign ownership
    const campaign = await Campaign.findOne({
      _id: campaignId,
      user: req.user._id,
    });
    
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }
    
    const report = await Report.findOne({ 
      campaignId, 
      user: req.user._id 
    });
    
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    
    // Analyze bounces
    const bouncesByType = {
      hard: 0,
      soft: 0
    };
    
    const bouncesByReason = {};
    
    report.bounces.details.forEach(bounce => {
      // Count by type
      bounce.type = bounce.type || 'hard'; // Default to hard bounce if not specified
      bouncesByType[bounce.type]++;
      
      // Count by reason
      const reason = bounce.reason || 'Unknown';
      bouncesByReason[reason] = (bouncesByReason[reason] || 0) + 1;
    });
    
    res.json({
      totalBounces: report.bounces.total,
      bounceRate: report.bounceRate,
      byType: bouncesByType,
      byReason: bouncesByReason,
      details: report.bounces.details
    });
  } catch (error) {
    console.error("Error getting bounce analytics:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * User-level analytics across campaigns
 */

// Get summary metrics for all user campaigns
exports.getUserSummary = async (req, res) => {
  try {
    // Get all reports for this user
    const reports = await Report.find({ user: req.user._id })
      .populate({
        path: 'campaignId',
        match: { user: req.user._id },
        select: 'name completedAt scheduledDate'
      });
    
    // Calculate aggregated metrics
    const summary = {
      totalCampaigns: reports.length,
      totalSent: 0,
      totalOpens: 0,
      totalClicks: 0,
      totalBounces: 0,
      totalUnsubscribes: 0,
      totalComplaints: 0,
      averageOpenRate: 0,
      averageClickRate: 0,
      averageBounceRate: 0,
      mostRecentCampaign: null,
      bestPerformingCampaign: null,
      metrics: {
        last30Days: {
          campaigns: 0,
          sent: 0,
          opens: 0,
          clicks: 0,
          openRate: 0,
          clickRate: 0
        },
        last90Days: {
          campaigns: 0,
          sent: 0,
          opens: 0,
          clicks: 0,
          openRate: 0,
          clickRate: 0
        },
        allTime: {
          campaigns: 0,
          sent: 0,
          opens: 0,
          clicks: 0,
          openRate: 0,
          clickRate: 0
        }
      }
    };
    
    // Calculate time thresholds
    const now = new Date();
    const last30Days = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const last90Days = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
    
    let bestPerformingRate = 0;
    let mostRecentDate = null;
    
    // Process each report
    reports.forEach(report => {
      if (!report.campaignId) return; // Skip if campaign was deleted
      
      const campaignDate = report.campaignId.completedAt || report.campaignId.scheduledDate;
      const campaignTime = campaignDate ? new Date(campaignDate) : null;
      
      // Update most recent campaign
      if (campaignTime && (!mostRecentDate || campaignTime > mostRecentDate)) {
        mostRecentDate = campaignTime;
        summary.mostRecentCampaign = {
          id: report.campaignId._id,
          name: report.campaignId.name,
          date: campaignTime,
          sent: report.totalSent,
          opens: report.opens.uniqueCount,
          clicks: report.clicks.uniqueCount
        };
      }
      
      // Find best performing campaign (by click rate)
      const clickRate = report.totalSent > 0 ? (report.clicks.uniqueCount / report.totalSent) * 100 : 0;
      if (clickRate > bestPerformingRate) {
        bestPerformingRate = clickRate;
        summary.bestPerformingCampaign = {
          id: report.campaignId._id,
          name: report.campaignId.name,
          date: campaignTime,
          sent: report.totalSent,
          opens: report.opens.uniqueCount,
          clicks: report.clicks.uniqueCount,
          openRate: report.openRate,
          clickRate: clickRate
        };
      }
      
      // Update all time metrics
      summary.totalSent += report.totalSent;
      summary.totalOpens += report.opens.uniqueCount;
      summary.totalClicks += report.clicks.uniqueCount;
      summary.totalBounces += report.bounces.total;
      summary.totalUnsubscribes += report.unsubscribes.total;
      summary.totalComplaints += report.complaints.total;
      
      summary.metrics.allTime.campaigns++;
      summary.metrics.allTime.sent += report.totalSent;
      summary.metrics.allTime.opens += report.opens.uniqueCount;
      summary.metrics.allTime.clicks += report.clicks.uniqueCount;
      
      // Update time-based metrics
      if (campaignTime) {
        if (campaignTime >= last30Days) {
          summary.metrics.last30Days.campaigns++;
          summary.metrics.last30Days.sent += report.totalSent;
          summary.metrics.last30Days.opens += report.opens.uniqueCount;
          summary.metrics.last30Days.clicks += report.clicks.uniqueCount;
        }
        
        if (campaignTime >= last90Days) {
          summary.metrics.last90Days.campaigns++;
          summary.metrics.last90Days.sent += report.totalSent;
          summary.metrics.last90Days.opens += report.opens.uniqueCount;
          summary.metrics.last90Days.clicks += report.clicks.uniqueCount;
        }
      }
    });
    
    // Calculate averages
    if (summary.totalSent > 0) {
      summary.averageOpenRate = (summary.totalOpens / summary.totalSent) * 100;
      summary.averageClickRate = (summary.totalClicks / summary.totalSent) * 100;
      summary.averageBounceRate = (summary.totalBounces / summary.totalSent) * 100;
      
      summary.metrics.allTime.openRate = (summary.metrics.allTime.opens / summary.metrics.allTime.sent) * 100;
      summary.metrics.allTime.clickRate = (summary.metrics.allTime.clicks / summary.metrics.allTime.sent) * 100;
    }
    
    if (summary.metrics.last30Days.sent > 0) {
      summary.metrics.last30Days.openRate = (summary.metrics.last30Days.opens / summary.metrics.last30Days.sent) * 100;
      summary.metrics.last30Days.clickRate = (summary.metrics.last30Days.clicks / summary.metrics.last30Days.sent) * 100;
    }
    
    if (summary.metrics.last90Days.sent > 0) {
      summary.metrics.last90Days.openRate = (summary.metrics.last90Days.opens / summary.metrics.last90Days.sent) * 100;
      summary.metrics.last90Days.clickRate = (summary.metrics.last90Days.clicks / summary.metrics.last90Days.sent) * 100;
    }
    
    res.json(summary);
  } catch (error) {
    console.error("Error getting user summary:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get performance data for all user campaigns
exports.getUserCampaignPerformance = async (req, res) => {
  try {
    // Get all campaigns for this user with their reports
    const campaigns = await Campaign.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('name subject completedAt scheduledDate status');
    
    const campaignIds = campaigns.map(c => c._id);
    
    const reports = await Report.find({ 
      campaignId: { $in: campaignIds }, 
      user: req.user._id 
    });
    
    // Map reports to campaigns
    const campaignPerformance = campaigns.map(campaign => {
      const report = reports.find(r => r.campaignId.toString() === campaign._id.toString());
      
      if (!report) {
        return {
          id: campaign._id,
          name: campaign.name,
          subject: campaign.subject,
          date: campaign.completedAt || campaign.scheduledDate,
          status: campaign.status,
          metrics: null
        };
      }
      
      return {
        id: campaign._id,
        name: campaign.name,
        subject: campaign.subject,
        date: campaign.completedAt || campaign.scheduledDate,
        status: campaign.status,
        metrics: {
          sent: report.totalSent,
          opens: {
            total: report.opens.total,
            unique: report.opens.uniqueCount,
            rate: report.openRate
          },
          clicks: {
            total: report.clicks.total,
            unique: report.clicks.uniqueCount,
            rate: report.clickRate,
            ctr: report.clickToOpenRate
          },
          bounces: {
            total: report.bounces.total,
            rate: report.bounceRate
          },
          unsubscribes: {
            total: report.unsubscribes.total,
            rate: report.unsubscribeRate
          }
        }
      };
    });
    
    res.json(campaignPerformance);
  } catch (error) {
    console.error("Error getting campaign performance:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get trend analytics for user
exports.getUserTrends = async (req, res) => {
  try {
    // Get all reports for this user
    const reports = await Report.find({ user: req.user._id })
      .populate({
        path: 'campaignId',
        match: { user: req.user._id },
        select: 'completedAt scheduledDate'
      });
    
    // Process trend data
    const trends = {
      daily: {},
      weekly: {},
      monthly: {}
    };
    
    // Process each report's daily stats
    reports.forEach(report => {
      if (!report.campaignId) return; // Skip if campaign was deleted
      
      report.dailyStats.forEach(stat => {
        const date = new Date(stat.date);
        
        // Skip future dates
        if (date > new Date()) return;
        
        // Daily trend
        const dailyKey = date.toISOString().split('T')[0];
        if (!trends.daily[dailyKey]) {
          trends.daily[dailyKey] = {
            date: dailyKey,
            opens: 0,
            clicks: 0,
            unsubscribes: 0,
            bounces: 0
          };
        }
        trends.daily[dailyKey].opens += stat.opens;
        trends.daily[dailyKey].clicks += stat.clicks;
        trends.daily[dailyKey].unsubscribes += stat.unsubscribes;
        trends.daily[dailyKey].bounces += stat.bounces;
        
        // Weekly trend
        const weekYear = getWeekNumber(date);
        const weekKey = `${weekYear[0]}-W${weekYear[1]}`;
        if (!trends.weekly[weekKey]) {
          trends.weekly[weekKey] = {
            week: weekKey,
            opens: 0,
            clicks: 0,
            unsubscribes: 0,
            bounces: 0
          };
        }
        trends.weekly[weekKey].opens += stat.opens;
        trends.weekly[weekKey].clicks += stat.clicks;
        trends.weekly[weekKey].unsubscribes += stat.unsubscribes;
        trends.weekly[weekKey].bounces += stat.bounces;
        
        // Monthly trend
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!trends.monthly[monthKey]) {
          trends.monthly[monthKey] = {
            month: monthKey,
            opens: 0,
            clicks: 0,
            unsubscribes: 0,
            bounces: 0
          };
        }
        trends.monthly[monthKey].opens += stat.opens;
        trends.monthly[monthKey].clicks += stat.clicks;
        trends.monthly[monthKey].unsubscribes += stat.unsubscribes;
        trends.monthly[monthKey].bounces += stat.bounces;
      });
    });
    
    // Convert to arrays and sort
    trends.daily = Object.values(trends.daily).sort((a, b) => a.date.localeCompare(b.date));
    trends.weekly = Object.values(trends.weekly).sort((a, b) => a.week.localeCompare(b.week));
    trends.monthly = Object.values(trends.monthly).sort((a, b) => a.month.localeCompare(b.month));
    
    res.json(trends);
  } catch (error) {
    console.error("Error getting user trends:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get geo distribution for all user campaigns
exports.getUserGeoDistribution = async (req, res) => {
  try {
    // Get all reports for this user
    const reports = await Report.find({ user: req.user._id });
    
    // Aggregate country data
    const countryData = {};
    
    reports.forEach(report => {
      // Process opens by country
      Object.entries(report.opens.byCountry || {}).forEach(([country, count]) => {
        if (!countryData[country]) {
          countryData[country] = {
            country,
            opens: 0,
            clicks: 0,
            openRate: 0,
            clickRate: 0
          };
        }
        countryData[country].opens += count;
      });
      
      // Process clicks by country
      Object.entries(report.clicks.byCountry || {}).forEach(([country, count]) => {
        if (!countryData[country]) {
          countryData[country] = {
            country,
            opens: 0,
            clicks: 0,
            openRate: 0,
            clickRate: 0
          };
        }
        countryData[country].clicks += count;
      });
    });
    
    // Calculate rates for each country
    Object.values(countryData).forEach(country => {
      if (country.opens > 0) {
        country.clickRate = (country.clicks / country.opens) * 100;
      }
    });
    
    // Sort by opens (descending)
    const sortedCountries = Object.values(countryData).sort((a, b) => b.opens - a.opens);
    
    res.json({
      countries: sortedCountries,
      // Include top countries for easier access
      topCountries: sortedCountries.slice(0, 10)
    });
  } catch (error) {
    console.error("Error getting geo distribution:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get device distribution for all user campaigns
exports.getUserDeviceDistribution = async (req, res) => {
  try {
    // Get all reports for this user
    const reports = await Report.find({ user: req.user._id });
    
    // Aggregate device data
    const deviceData = {
      byType: {},
      byBrowser: {},
      byOS: {},
      byEmailClient: {}
    };
    
    reports.forEach(report => {
      // Process device types
      Object.entries(report.opens.byDevice || {}).forEach(([type, count]) => {
        deviceData.byType[type] = (deviceData.byType[type] || 0) + count;
      });
      
      // Process browsers
      Object.entries(report.opens.byBrowser || {}).forEach(([browser, count]) => {
        deviceData.byBrowser[browser] = (deviceData.byBrowser[browser] || 0) + count;
      });
      
      // Process OS and email clients from detailed data
      report.opens.details.forEach(open => {
        if (open.device && open.device.os) {
          const os = open.device.os;
          deviceData.byOS[os] = (deviceData.byOS[os] || 0) + 1;
        }
        
        if (open.platform) {
          deviceData.byEmailClient[open.platform] = 
            (deviceData.byEmailClient[open.platform] || 0) + 1;
        }
      });
    });
    
    // Calculate percentages
    const calculatePercentages = (data) => {
      const total = Object.values(data).reduce((sum, count) => sum + count, 0);
      
      if (total === 0) return data;
      
      const result = {};
      Object.entries(data).forEach(([key, count]) => {
        result[key] = {
          count,
          percentage: (count / total) * 100
        };
      });
      
      return result;
    };
    
    res.json({
      deviceTypes: calculatePercentages(deviceData.byType),
      browsers: calculatePercentages(deviceData.byBrowser),
      operatingSystems: calculatePercentages(deviceData.byOS),
      emailClients: calculatePercentages(deviceData.byEmailClient)
    });
  } catch (error) {
    console.error("Error getting device distribution:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get timing analytics for all user campaigns
exports.getUserTimingAnalytics = async (req, res) => {
  try {
    // Get all reports for this user
    const reports = await Report.find({ user: req.user._id });
    
    // Initialize timing data
    const timingData = {
      byHourOfDay: new Array(24).fill(0),
      byDayOfWeek: {
        "Monday": 0,
        "Tuesday": 0,
        "Wednesday": 0,
        "Thursday": 0,
        "Friday": 0,
        "Saturday": 0,
        "Sunday": 0
      },
      byTimeOfDay: {
        "morning": 0,
        "afternoon": 0,
        "evening": 0,
        "night": 0
      }
    };
    
    // Aggregate timing data
    reports.forEach(report => {
      // Process hour of day
      report.opens.details.forEach(open => {
        const hour = new Date(open.timestamp).getHours();
        timingData.byHourOfDay[hour]++;
        
        // Add to day of week if available
        if (open.dayOfWeek) {
          timingData.byDayOfWeek[open.dayOfWeek] = 
            (timingData.byDayOfWeek[open.dayOfWeek] || 0) + 1;
        }
        
        // Add to time of day if available
        if (open.timeOfDay) {
          timingData.byTimeOfDay[open.timeOfDay] = 
            (timingData.byTimeOfDay[open.timeOfDay] || 0) + 1;
        }
      });
    });
    
    // Calculate total opens
    const totalOpens = timingData.byHourOfDay.reduce((sum, count) => sum + count, 0);
    
    // Calculate percentages for each hour
    const hourlyPercentages = timingData.byHourOfDay.map(
      count => totalOpens > 0 ? (count / totalOpens) * 100 : 0
    );
    
    // Calculate best performing hours (top 3)
    const bestHours = timingData.byHourOfDay
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => ({
        hour: item.hour,
        count: item.count,
        percentage: totalOpens > 0 ? (item.count / totalOpens) * 100 : 0
      }));
    
    // Calculate best performing days
    const totalDayOpens = Object.values(timingData.byDayOfWeek).reduce((sum, count) => sum + count, 0);
    
    const bestDays = Object.entries(timingData.byDayOfWeek)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => b.count - a.count)
      .map(item => ({
        day: item.day,
        count: item.count,
        percentage: totalDayOpens > 0 ? (item.count / totalDayOpens) * 100 : 0
      }));
    
    res.json({
      byHourOfDay: {
        counts: timingData.byHourOfDay,
        percentages: hourlyPercentages,
        bestHours
      },
      byDayOfWeek: {
        counts: timingData.byDayOfWeek,
        bestDays
      },
      byTimeOfDay: timingData.byTimeOfDay,
      recommendations: {
        bestTimeToSend: bestHours.length > 0 ? 
          `${bestHours[0].hour}:00 - ${bestHours[0].hour + 1}:00` : 'No data',
        bestDayToSend: bestDays.length > 0 ? bestDays[0].day : 'No data'
      }
    });
  } catch (error) {
    console.error("Error getting timing analytics:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Comparative and advanced analytics
 */

// Compare multiple campaigns
exports.compareCampaigns = async (req, res) => {
  try {
    const { campaignIds } = req.query;
    
    if (!campaignIds) {
      return res.status(400).json({ message: "Campaign IDs are required" });
    }
    
    const campaignIdArray = Array.isArray(campaignIds) ? 
      campaignIds : campaignIds.split(',');
    
    // Verify that all campaigns belong to the user
    const campaigns = await Campaign.find({
      _id: { $in: campaignIdArray },
      user: req.user._id
    }).select('name subject completedAt scheduledDate');
    
    if (campaigns.length === 0) {
      return res.status(404).json({ message: "No valid campaigns found" });
    }
    
    // Get reports for these campaigns
    const reports = await Report.find({
      campaignId: { $in: campaigns.map(c => c._id) },
      user: req.user._id
    });
    
    // Map reports to campaigns
    const comparisonData = campaigns.map(campaign => {
      const report = reports.find(r => r.campaignId.toString() === campaign._id.toString());
      
      if (!report) {
        return {
          id: campaign._id,
          name: campaign.name,
          subject: campaign.subject,
          date: campaign.completedAt || campaign.scheduledDate,
          metrics: null
        };
      }
      
      return {
        id: campaign._id,
        name: campaign.name,
        subject: campaign.subject,
        date: campaign.completedAt || campaign.scheduledDate,
        metrics: {
          sent: report.totalSent,
          openRate: report.openRate,
          clickRate: report.clickRate,
          clickToOpenRate: report.clickToOpenRate,
          bounceRate: report.bounceRate,
          unsubscribeRate: report.unsubscribeRate,
          topCountries: Object.entries(report.opens.byCountry || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([country, count]) => ({ country, count })),
          topDevices: Object.entries(report.opens.byDevice || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([device, count]) => ({ device, count }))
        }
      };
    });
    
    res.json(comparisonData);
  } catch (error) {
    console.error("Error comparing campaigns:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get industry benchmarks to compare against
exports.getBenchmarks = async (req, res) => {
  try {
    // Calculate user's average metrics
    const reports = await Report.find({ user: req.user._id });
    
    let totalSent = 0;
    let totalOpens = 0;
    let totalClicks = 0;
    let totalBounces = 0;
    let totalUnsubscribes = 0;
    
    reports.forEach(report => {
      totalSent += report.totalSent;
      totalOpens += report.opens.uniqueCount;
      totalClicks += report.clicks.uniqueCount;
      totalBounces += report.bounces.total;
      totalUnsubscribes += report.unsubscribes.total;
    });
    
    const userMetrics = {
      openRate: totalSent > 0 ? (totalOpens / totalSent) * 100 : 0,
      clickRate: totalSent > 0 ? (totalClicks / totalSent) * 100 : 0,
      clickToOpenRate: totalOpens > 0 ? (totalClicks / totalOpens) * 100 : 0,
      bounceRate: totalSent > 0 ? (totalBounces / totalSent) * 100 : 0,
      unsubscribeRate: totalSent > 0 ? (totalUnsubscribes / totalSent) * 100 : 0
    };
    
    // Note: In a real implementation, you would fetch actual industry benchmarks
    // from a database or external API. For this example, we'll use static data.
    const industryBenchmarks = {
      general: {
        openRate: 21.33,
        clickRate: 2.62,
        clickToOpenRate: 12.28,
        bounceRate: 0.7,
        unsubscribeRate: 0.1
      },
      categories: {
        marketing: {
          openRate: 19.83,
          clickRate: 2.33,
          clickToOpenRate: 11.75,
          bounceRate: 0.6,
          unsubscribeRate: 0.2
        },
        retail: {
          openRate: 18.39,
          clickRate: 2.01,
          clickToOpenRate: 10.93,
          bounceRate: 0.5,
          unsubscribeRate: 0.15
        },
        technology: {
          openRate: 21.93,
          clickRate: 2.45,
          clickToOpenRate: 11.17,
          bounceRate: 0.4,
          unsubscribeRate: 0.11
        }
      }
    };
    
    // Compare user metrics to benchmarks
    const compareMetric = (userValue, benchmarkValue) => {
      const difference = userValue - benchmarkValue;
      const percentageDifference = benchmarkValue > 0 ? 
        (difference / benchmarkValue) * 100 : 0;
      
      return {
        user: userValue,
        benchmark: benchmarkValue,
        difference,
        percentageDifference,
        performance: difference > 0 ? 'above' : 
                      difference < 0 ? 'below' : 'equal'
      };
    };
    
    const comparison = {
      openRate: compareMetric(userMetrics.openRate, industryBenchmarks.general.openRate),
      clickRate: compareMetric(userMetrics.clickRate, industryBenchmarks.general.clickRate),
      clickToOpenRate: compareMetric(userMetrics.clickToOpenRate, industryBenchmarks.general.clickToOpenRate),
      bounceRate: compareMetric(userMetrics.bounceRate, industryBenchmarks.general.bounceRate),
      unsubscribeRate: compareMetric(userMetrics.unsubscribeRate, industryBenchmarks.general.unsubscribeRate)
    };
    
    res.json({
      userMetrics,
      industryBenchmarks,
      comparison
    });
  } catch (error) {
    console.error("Error getting benchmarks:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get personalized recommendations based on analytics
exports.getRecommendations = async (req, res) => {
  try {
    // Get all reports for this user
    const reports = await Report.find({ user: req.user._id });

    if (reports.length === 0) {
      return res.json({
        recommendations: [
          {
            type: "general",
            title: "Send your first campaign",
            description:
              "Start gathering data by sending your first campaign to analyze performance.",
          },
        ],
      });
    }

    // Initialize recommendations
    const recommendations = [];

    // Aggregate metrics from all campaigns
    let totalSent = 0;
    let totalOpens = 0;
    let totalUniqueOpens = 0;
    let totalClicks = 0;
    let totalUniqueClicks = 0;
    let totalBounces = 0;
    let totalUnsubscribes = 0;

    // Collect data for analysis
    const deviceData = {};
    const browserData = {};
    const timeOfDayData = {};
    const dayOfWeekData = {};
    const countryData = {};

    reports.forEach((report) => {
      totalSent += report.totalSent;
      totalOpens += report.opens.total;
      totalUniqueOpens += report.opens.uniqueCount;
      totalClicks += report.clicks.total;
      totalUniqueClicks += report.clicks.uniqueCount;
      totalBounces += report.bounces.total;
      totalUnsubscribes += report.unsubscribes.total;

      // Collect device data
      Object.entries(report.opens.byDevice || {}).forEach(([device, count]) => {
        deviceData[device] = (deviceData[device] || 0) + count;
      });

      // Collect browser data
      Object.entries(report.opens.byBrowser || {}).forEach(
        ([browser, count]) => {
          browserData[browser] = (browserData[browser] || 0) + count;
        }
      );

      // Collect time of day data
      Object.entries(report.opens.byTimeOfDay || {}).forEach(
        ([time, count]) => {
          timeOfDayData[time] = (timeOfDayData[time] || 0) + count;
        }
      );

      // Collect day of week data
      Object.entries(report.opens.byDayOfWeek || {}).forEach(([day, count]) => {
        dayOfWeekData[day] = (dayOfWeekData[day] || 0) + count;
      });

      // Collect country data
      Object.entries(report.opens.byCountry || {}).forEach(
        ([country, count]) => {
          countryData[country] = (countryData[country] || 0) + count;
        }
      );
    });

    // Calculate averages
    const avgOpenRate =
      totalSent > 0 ? (totalUniqueOpens / totalSent) * 100 : 0;
    const avgClickRate =
      totalSent > 0 ? (totalUniqueClicks / totalSent) * 100 : 0;
    const avgClickToOpenRate =
      totalUniqueOpens > 0 ? (totalUniqueClicks / totalUniqueOpens) * 100 : 0;
    const avgBounceRate = totalSent > 0 ? (totalBounces / totalSent) * 100 : 0;
    const avgUnsubscribeRate =
      totalSent > 0 ? (totalUnsubscribes / totalSent) * 100 : 0;

    // Generate recommendations based on metrics

    // 1. Open Rate Recommendations
    if (avgOpenRate < 15) {
      recommendations.push({
        type: "improvement",
        metric: "openRate",
        title: "Improve Your Open Rate",
        description:
          "Your average open rate is below industry standards. Consider testing different subject lines and sender names to increase engagement.",
        currentValue: avgOpenRate.toFixed(2) + "%",
        targetValue: "20%+",
      });
    }

    // 2. Click Rate Recommendations
    if (avgClickRate < 2) {
      recommendations.push({
        type: "improvement",
        metric: "clickRate",
        title: "Boost Your Click Rate",
        description:
          "Your click rate could be improved. Try using more compelling call-to-action buttons and ensure your content is relevant to your audience.",
        currentValue: avgClickRate.toFixed(2) + "%",
        targetValue: "2.5%+",
      });
    }

    // 3. Bounce Rate Recommendations
    if (avgBounceRate > 2) {
      recommendations.push({
        type: "warning",
        metric: "bounceRate",
        title: "Address High Bounce Rate",
        description:
          "Your bounce rate is higher than recommended. Clean your email list regularly and ensure you're using double opt-in to maintain list quality.",
        currentValue: avgBounceRate.toFixed(2) + "%",
        targetValue: "< 1%",
      });
    }

    // 4. Timing Recommendations
    if (Object.keys(timeOfDayData).length > 0) {
      const bestTimeOfDay = Object.entries(timeOfDayData).sort(
        (a, b) => b[1] - a[1]
      )[0][0];

      recommendations.push({
        type: "optimization",
        metric: "timing",
        title: "Optimize Sending Time",
        description: `Your subscribers engage most during the ${bestTimeOfDay}. Consider scheduling your campaigns during this time for better results.`,
        data: { bestTimeOfDay },
      });
    }

    if (Object.keys(dayOfWeekData).length > 0) {
      const bestDayOfWeek = Object.entries(dayOfWeekData).sort(
        (a, b) => b[1] - a[1]
      )[0][0];

      recommendations.push({
        type: "optimization",
        metric: "timing",
        title: "Best Day to Send",
        description: `${bestDayOfWeek} shows the highest engagement from your audience. Consider this when scheduling your campaigns.`,
        data: { bestDayOfWeek },
      });
    }

    // 5. Device Optimization
    if (Object.keys(deviceData).length > 0) {
      const dominantDevice = Object.entries(deviceData).sort(
        (a, b) => b[1] - a[1]
      )[0][0];

      const devicePercentage = (deviceData[dominantDevice] / totalOpens) * 100;

      if (devicePercentage > 60) {
        recommendations.push({
          type: "optimization",
          metric: "device",
          title:
            "Optimize for " +
            (dominantDevice === "desktop" ? "Desktop" : "Mobile"),
          description: `${Math.round(
            devicePercentage
          )}% of your opens are on ${dominantDevice} devices. Ensure your emails are optimized for this platform.`,
          data: {
            dominantDevice,
            percentage: devicePercentage.toFixed(1) + "%",
          },
        });
      }
    }

    // 6. Geographic Targeting
    if (Object.keys(countryData).length > 0) {
      const topCountries = Object.entries(countryData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([country, count]) => ({
          country,
          percentage: ((count / totalOpens) * 100).toFixed(1) + "%",
        }));

      recommendations.push({
        type: "targeting",
        metric: "geography",
        title: "Geographic Targeting Opportunity",
        description: `Your top engaging countries are ${topCountries
          .map((c) => c.country)
          .join(
            ", "
          )}. Consider sending at optimal times for these regions or creating location-specific content.`,
        data: { topCountries },
      });
    }

    // 7. Content Recommendations
    // Compare subject line length of top performing campaigns
    const campaignPerformance = await Promise.all(
      reports.map(async (report) => {
        const campaign = await Campaign.findById(report.campaignId);
        if (!campaign) return null;

        return {
          id: campaign._id,
          subject: campaign.subject,
          openRate:
            report.totalSent > 0
              ? (report.opens.uniqueCount / report.totalSent) * 100
              : 0,
        };
      })
    );

    const validCampaigns = campaignPerformance.filter((c) => c !== null);

    if (validCampaigns.length >= 3) {
      // Sort by open rate
      validCampaigns.sort((a, b) => b.openRate - a.openRate);

      // Analyze top 3 performing campaigns
      const topCampaigns = validCampaigns.slice(0, 3);

      // Calculate average subject length of top campaigns
      const avgSubjectLength =
        topCampaigns.reduce(
          (sum, campaign) =>
            sum + (campaign.subject ? campaign.subject.length : 0),
          0
        ) / topCampaigns.length;

      recommendations.push({
        type: "content",
        metric: "subjectLine",
        title: "Optimal Subject Line Length",
        description: `Your best performing campaigns have subject lines around ${Math.round(
          avgSubjectLength
        )} characters. Aim for similar length in future campaigns.`,
        data: {
          avgSubjectLength: Math.round(avgSubjectLength),
          topPerformers: topCampaigns.map((c) => ({
            subjectPreview: c.subject
              ? c.subject.length > 30
                ? c.subject.substring(0, 30) + "..."
                : c.subject
              : "",
            openRate: c.openRate.toFixed(1) + "%",
          })),
        },
      });
    }

    // 8. Segmentation Recommendation
    if (reports.length >= 5) {
      recommendations.push({
        type: "advanced",
        metric: "segmentation",
        title: "Try Audience Segmentation",
        description:
          "You have enough campaign data to start segmenting your audience. Try creating segments based on engagement level, geography, or interests for more targeted messaging.",
        steps: [
          "Create a 'highly engaged' segment of subscribers who open frequently",
          "Create a 're-engagement' segment for subscribers who haven't opened recently",
          "Consider device-specific segments for optimized content",
        ],
      });
    }

    // 9. A/B Testing Recommendation
    recommendations.push({
      type: "advanced",
      metric: "testing",
      title: "Implement A/B Testing",
      description:
        "Experiment with different elements of your campaigns to optimize performance.",
      steps: [
        "Test different subject lines to improve open rates",
        "Try various call-to-action formats to boost click rates",
        "Experiment with different content layouts",
      ],
    });

    res.json({
      metrics: {
        openRate: avgOpenRate.toFixed(2) + "%",
        clickRate: avgClickRate.toFixed(2) + "%",
        clickToOpenRate: avgClickToOpenRate.toFixed(2) + "%",
        bounceRate: avgBounceRate.toFixed(2) + "%",
        unsubscribeRate: avgUnsubscribeRate.toFixed(2) + "%",
      },
      recommendations: recommendations,
    });
  } catch (error) {
    console.error("Error generating recommendations:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Helper functions
 */

// Calculate median of an array of numbers
function calculateMedian(numbers) {
  if (!numbers.length) return 0;

  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

// Calculate average of an array of numbers
function calculateAverage(numbers) {
  if (!numbers.length) return 0;
  return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
}

// Get ISO week number for a date
function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return [d.getFullYear(), weekNo];
}

module.exports = exports;