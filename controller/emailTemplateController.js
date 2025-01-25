// const EmailTemplate = require("../model/emailTemplateModel");

// exports.getAllTemplates = async (req, res) => {
//   try {
//     const templates = await EmailTemplate.find({ user: req.user._id });
//     res.json(templates);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.createTemplate = async (req, res) => {
//   const template = new EmailTemplate({
//     name: req.body.name,
//     content: req.body.content,
//     htmlStructure: req.body.htmlStructure,
//     user: req.user._id, // Add user reference
//   });

//   try {
//     const newTemplate = await template.save();
//     res.status(201).json(newTemplate);
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// };

// exports.getTemplate = async (req, res) => {
//   res.json(res.template);
// };

// exports.updateTemplate = async (req, res) => {
//   try {
//     const template = await EmailTemplate.findOne({
//       _id: req.params.id,
//       user: req.user._id,
//     });

//     if (!template) {
//       return res.status(404).json({ message: "Template not found" });
//     }

//     if (req.body.name != null) {
//       template.name = req.body.name;
//     }
//     if (req.body.content != null) {
//       template.content = req.body.content;
//     }
//     if (req.body.htmlStructure != null) {
//       template.htmlStructure = req.body.htmlStructure;
//     }

//     const updatedTemplate = await template.save();
//     res.json(updatedTemplate);
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// };

// exports.deleteTemplate = async (req, res) => {
//   try {
//     const template = await EmailTemplate.findOne({
//       _id: req.params.id,
//       user: req.user._id,
//     });

//     if (!template) {
//       return res.status(404).json({ message: "Template not found" });
//     }

//     await template.remove();
//     res.json({ message: "Template deleted" });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.getTemplateMiddleware = async (req, res, next) => {
//   try {
//     const template = await EmailTemplate.findOne({
//       _id: req.params.id,
//       user: req.user._id,
//     });

//     if (!template) {
//       return res.status(404).json({ message: "Template not found" });
//     }

//     res.template = template;
//     next();
//   } catch (err) {
//     return res.status(500).json({ message: err.message });
//   }
// };

// module.exports = exports;
const EmailTemplate = require("../model/emailTemplateModel");

const emailTemplateController = {
  getAllTemplates: async (req, res) => {
    try {
      const templates = await EmailTemplate.find({ user: req.user._id });

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

  createTemplate: async (req, res) => {
    try {
      const template = new EmailTemplate({
        name: req.body.name,
        content: req.body.content,
        htmlStructure: req.body.htmlStructure,
        user: req.user._id,
      });

      const newTemplate = await template.save();

      // Increment both total and active counts
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

  deleteTemplate: async (req, res) => {
    try {
      const template = await EmailTemplate.findOne({
        _id: req.params.id,
        user: req.user._id,
      });

      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      await template.remove();

      // Only decrease active count, total remains unchanged
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

  // Other methods remain unchanged...
  getTemplate: async (req, res) => {
    res.json(res.template);
  },

  updateTemplate: async (req, res) => {
    try {
      const template = await EmailTemplate.findOne({
        _id: req.params.id,
        user: req.user._id,
      });

      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      if (req.body.name != null) {
        template.name = req.body.name;
      }
      if (req.body.content != null) {
        template.content = req.body.content;
      }
      if (req.body.htmlStructure != null) {
        template.htmlStructure = req.body.htmlStructure;
      }

      const updatedTemplate = await template.save();
      res.json(updatedTemplate);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  },

  getTemplateMiddleware: async (req, res, next) => {
    try {
      const template = await EmailTemplate.findOne({
        _id: req.params.id,
        user: req.user._id,
      });

      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      res.template = template;
      next();
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },
};

module.exports = emailTemplateController;
