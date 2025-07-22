const EmailTemplate = require("../model/emailTemplateModel");

const emailTemplateController = {
  // Get all templates
  getAllTemplates: async (req, res) => {
    try {
      const query = { organization: req.organization };
      if (req.user.role !== "admin") query.user = req.user._id;

      const templates = await EmailTemplate.find(query).sort({ createdAt: -1 });

      res.json({
        templates,
        usage: {
          totalCreated: req.user.subscription.usage.templates.totalUsed,
          activeCount: req.user.subscription.usage.templates.activeCount,
          limit: req.user.getCurrentLimits().templates,
          remaining: await req.user.getRemainingQuota("templates", "total"),
        },
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // Create template
  createTemplate: async (req, res) => {
    try {
      const template = new EmailTemplate({
        name: req.body.name,
        content: req.body.content,
        htmlStructure: req.body.htmlStructure,
        user: req.user._id,
        organization: req.organization,
      });

      const newTemplate = await template.save();

      // Update usage
      await req.user.updateUsage("templates", "total", 1);
      await req.user.updateUsage("templates", "active", 1);

      res.status(201).json({
        template: newTemplate,
        usage: {
          totalCreated: req.user.subscription.usage.templates.totalUsed,
          activeCount: req.user.subscription.usage.templates.activeCount,
          limit: req.user.getCurrentLimits().templates,
          remaining: await req.user.getRemainingQuota("templates", "total"),
        },
      });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  },

  // Get single template (from middleware)
  getTemplate: async (req, res) => {
    res.json(req.template);
  },

  // Update template
  updateTemplate: async (req, res) => {
    try {
      const template = req.template; // From middleware
      if (req.body.name) template.name = req.body.name;
      if (req.body.content) template.content = req.body.content;
      if (req.body.htmlStructure) template.htmlStructure = req.body.htmlStructure;

      const updatedTemplate = await template.save();
      res.json(updatedTemplate);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  },

  // Delete template
  deleteTemplate: async (req, res) => {
    try {
      await req.template.remove();
      await req.user.updateUsage("templates", "active", -1);

      res.json({
        message: "Template deleted",
        usage: {
          totalCreated: req.user.subscription.usage.templates.totalUsed,
          activeCount: req.user.subscription.usage.templates.activeCount,
          limit: req.user.getCurrentLimits().templates,
          remaining: await req.user.getRemainingQuota("templates", "total"),
        },
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // Middleware to fetch template
  getTemplateMiddleware: async (req, res, next) => {
    try {
      const query = { _id: req.params.id, organization: req.organization };
      if (req.user.role !== "admin") query.user = req.user._id;

      const template = await EmailTemplate.findOne(query);

      if (!template) return res.status(404).json({ message: "Template not found" });

      req.template = template;
      next();
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
};

module.exports = emailTemplateController;
