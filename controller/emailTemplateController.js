// src/controllers/emailTemplate.controller.js
const EmailTemplate = require("../model/emailTemplateModel");

exports.getAllTemplates = async (req, res) => {
  try {
    const templates = await EmailTemplate.find();
    res.json(templates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// exports.createTemplate = async (req, res) => {
//   const template = new EmailTemplate({
//     name: req.body.name,
//     content: req.body.content,
//   });

//   try {
//     const newTemplate = await template.save();
//     res.status(201).json(newTemplate);
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// };

exports.createTemplate = async (req, res) => {
  const template = new EmailTemplate({
    name: req.body.name,
    content: req.body.content,
    htmlStructure: req.body.htmlStructure,
  });

  try {
    const newTemplate = await template.save();
    res.status(201).json(newTemplate);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getTemplate = async (req, res) => {
  res.json(res.template);
};

exports.updateTemplate = async (req, res) => {
  if (req.body.name != null) {
    res.template.name = req.body.name;
  }
  if (req.body.content != null) {
    res.template.content = req.body.content;
  }

  try {
    const updatedTemplate = await res.template.save();
    res.json(updatedTemplate);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    await res.template.remove();
    res.json({ message: "Template deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getTemplateMiddleware = async (req, res, next) => {
  let template;
  try {
    template = await EmailTemplate.findById(req.params.id);
    if (template == null) {
      return res.status(404).json({ message: "Cannot find template" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.template = template;
  next();
};
