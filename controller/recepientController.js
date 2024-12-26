// controllers/recipientController.js
const RecipientList = require("../model/recipientModel");

exports.createList = async (req, res) => {
  try {
    const { listName, recipients, tags, description } = req.body;

    // Validate recipients array
    if (!Array.isArray(recipients)) {
      return res.status(400).json({ message: "Recipients array is required" });
    }

    // Create new recipient list
    const recipientList = new RecipientList({
      listName,
      recipients: recipients || [],
      tags: tags || [],
      description,
      user: req.user._id,
    });

    await recipientList.save();
    res.status(201).json(recipientList);
  } catch (error) {
    console.error("Error creating recipient list:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getAllLists = async (req, res) => {
  try {
    const lists = await RecipientList.find({ user: req.user._id })
      .select("-recipients") // Exclude recipient details for list view
      .sort({ createdAt: -1 });

    res.json(lists);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getListById = async (req, res) => {
  try {
    const list = await RecipientList.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!list) {
      return res.status(404).json({ message: "Recipient list not found" });
    }

    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateList = async (req, res) => {
  try {
    const { listName, recipients, tags, description } = req.body;

    const list = await RecipientList.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!list) {
      return res.status(404).json({ message: "Recipient list not found" });
    }

    // Update fields if provided
    if (listName) list.listName = listName;
    if (recipients) list.recipients = recipients;
    if (tags) list.tags = tags;
    if (description) list.description = description;

    await list.save();
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteList = async (req, res) => {
  try {
    const list = await RecipientList.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!list) {
      return res.status(404).json({ message: "Recipient list not found" });
    }

    res.json({ message: "Recipient list deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addRecipientsToList = async (req, res) => {
  try {
    const { recipients } = req.body;

    const list = await RecipientList.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!list) {
      return res.status(404).json({ message: "Recipient list not found" });
    }

    // Add new recipients
    list.recipients.push(...recipients);
    await list.save();

    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.removeRecipientsFromList = async (req, res) => {
  try {
    const { emails } = req.body;

    const list = await RecipientList.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!list) {
      return res.status(404).json({ message: "Recipient list not found" });
    }

    // Remove recipients by email
    list.recipients = list.recipients.filter((r) => !emails.includes(r.email));
    await list.save();

    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.searchRecipients = async (req, res) => {
  try {
    const { query, tags } = req.query;
    const filter = { user: req.user._id };

    // Add search conditions
    if (query) {
      filter.$or = [
        { "recipients.email": { $regex: query, $options: "i" } },
        { "recipients.name": { $regex: query, $options: "i" } },
      ];
    }

    if (tags) {
      const tagArray = tags.split(",").map((tag) => tag.trim());
      filter.tags = { $in: tagArray };
    }

    const lists = await RecipientList.find(filter);
    res.json(lists);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.uploadRecipients = async (req, res) => {
  try {
    const { listName, recipients, tags, description } = req.body;

    // Validate the CSV data
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res
        .status(400)
        .json({ message: "Valid recipients data is required" });
    }

    // Create new list with uploaded recipients
    const recipientList = new RecipientList({
      listName,
      recipients: recipients.map((r) => ({
        email: r.email.toLowerCase(),
        name: r.name,
        tags: r.tags || [],
        additionalInfo: r.additionalInfo || {},
      })),
      tags: tags || [],
      description,
      user: req.user._id,
    });

    await recipientList.save();
    res.status(201).json(recipientList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
