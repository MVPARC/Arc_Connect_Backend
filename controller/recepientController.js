// // controllers/recipientController.js
// const RecipientList = require("../model/recipientModel");

// exports.createList = async (req, res) => {
//   try {
//     const { listName, recipients, tags, description } = req.body;

//     // Validate recipients array
//     if (!Array.isArray(recipients)) {
//       return res.status(400).json({ message: "Recipients array is required" });
//     }

//     // Create new recipient list
//     const recipientList = new RecipientList({
//       listName,
//       recipients: recipients || [],
//       tags: tags || [],
//       description,
//       user: req.user._id,
//     });

//     await recipientList.save();
//     res.status(201).json(recipientList);
//   } catch (error) {
//     console.error("Error creating recipient list:", error);
//     res.status(500).json({ message: error.message });
//   }
// };

// exports.getAllLists = async (req, res) => {
//   try {
//     const lists = await RecipientList.find({ user: req.user._id })
//       .select("-recipients") // Exclude recipient details for list view
//       .sort({ createdAt: -1 });

//     res.json(lists);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// exports.getListById = async (req, res) => {
//   try {
//     const list = await RecipientList.findOne({
//       _id: req.params.id,
//       user: req.user._id,
//     });

//     if (!list) {
//       return res.status(404).json({ message: "Recipient list not found" });
//     }

//     res.json(list);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// exports.updateList = async (req, res) => {
//   try {
//     const { listName, recipients, tags, description } = req.body;

//     const list = await RecipientList.findOne({
//       _id: req.params.id,
//       user: req.user._id,
//     });

//     if (!list) {
//       return res.status(404).json({ message: "Recipient list not found" });
//     }

//     // Update fields if provided
//     if (listName) list.listName = listName;
//     if (recipients) list.recipients = recipients;
//     if (tags) list.tags = tags;
//     if (description) list.description = description;

//     await list.save();
//     res.json(list);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// exports.deleteList = async (req, res) => {
//   try {
//     const list = await RecipientList.findOneAndDelete({
//       _id: req.params.id,
//       user: req.user._id,
//     });

//     if (!list) {
//       return res.status(404).json({ message: "Recipient list not found" });
//     }

//     res.json({ message: "Recipient list deleted successfully" });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// exports.addRecipientsToList = async (req, res) => {
//   try {
//     const { recipients } = req.body;

//     const list = await RecipientList.findOne({
//       _id: req.params.id,
//       user: req.user._id,
//     });

//     if (!list) {
//       return res.status(404).json({ message: "Recipient list not found" });
//     }

//     // Add new recipients
//     list.recipients.push(...recipients);
//     await list.save();

//     res.json(list);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// exports.removeRecipientsFromList = async (req, res) => {
//   try {
//     const { emails } = req.body;

//     const list = await RecipientList.findOne({
//       _id: req.params.id,
//       user: req.user._id,
//     });

//     if (!list) {
//       return res.status(404).json({ message: "Recipient list not found" });
//     }

//     // Remove recipients by email
//     list.recipients = list.recipients.filter((r) => !emails.includes(r.email));
//     await list.save();

//     res.json(list);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// exports.searchRecipients = async (req, res) => {
//   try {
//     const { query, tags } = req.query;
//     const filter = { user: req.user._id };

//     // Add search conditions
//     if (query) {
//       filter.$or = [
//         { "recipients.email": { $regex: query, $options: "i" } },
//         { "recipients.name": { $regex: query, $options: "i" } },
//       ];
//     }

//     if (tags) {
//       const tagArray = tags.split(",").map((tag) => tag.trim());
//       filter.tags = { $in: tagArray };
//     }

//     const lists = await RecipientList.find(filter);
//     res.json(lists);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// exports.uploadRecipients = async (req, res) => {
//   try {
//     const { listName, recipients, tags, description } = req.body;

//     // Validate the CSV data
//     if (!Array.isArray(recipients) || recipients.length === 0) {
//       return res
//         .status(400)
//         .json({ message: "Valid recipients data is required" });
//     }

//     // Create new list with uploaded recipients
//     const recipientList = new RecipientList({
//       listName,
//       recipients: recipients.map((r) => ({
//         email: r.email.toLowerCase(),
//         name: r.name,
//         tags: r.tags || [],
//         additionalInfo: r.additionalInfo || {},
//       })),
//       tags: tags || [],
//       description,
//       user: req.user._id,
//     });

//     await recipientList.save();
//     res.status(201).json(recipientList);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

const RecipientList = require("../model/recipientModel");

const recipientController = {
  createList: async (req, res) => {
    try {
      const { listName, recipients, tags, description } = req.body;

      if (!Array.isArray(recipients)) {
        return res
          .status(400)
          .json({ message: "Recipients array is required" });
      }

      // Check if adding these contacts would exceed the limit
      const currentUsage = req.user.subscription.usage.contacts.count;
      const newContactsCount = recipients.length;
      const totalLimit = req.user.getCurrentLimits().contacts;

      if (currentUsage + newContactsCount > totalLimit) {
        return res.status(403).json({
          message: "Adding these contacts would exceed your subscription limit",
          currentUsage,
          limit: totalLimit,
          attempting: newContactsCount,
        });
      }

      const recipientList = new RecipientList({
        listName,
        recipients: recipients || [],
        tags: tags || [],
        description,
        user: req.user._id,
      });

      await recipientList.save();

      // Update contact usage count
      await req.user.updateUsage("contacts", "count", recipients.length);

      res.status(201).json({
        recipientList,
        usage: {
          used: currentUsage + newContactsCount,
          limit: totalLimit,
          remaining: totalLimit - (currentUsage + newContactsCount),
        },
      });
    } catch (error) {
      console.error("Error creating recipient list:", error);
      res.status(500).json({ message: error.message });
    }
  },

  addRecipientsToList: async (req, res) => {
    try {
      const { recipients } = req.body;

      const list = await RecipientList.findOne({
        _id: req.params.id,
        user: req.user._id,
      });

      if (!list) {
        return res.status(404).json({ message: "Recipient list not found" });
      }

      // Check if adding these contacts would exceed the limit
      const currentUsage = req.user.subscription.usage.contacts.count;
      const newContactsCount = recipients.length;
      const totalLimit = req.user.getCurrentLimits().contacts;

      if (currentUsage + newContactsCount > totalLimit) {
        return res.status(403).json({
          message: "Adding these contacts would exceed your subscription limit",
          currentUsage,
          limit: totalLimit,
          attempting: newContactsCount,
        });
      }

      // Add new recipients
      list.recipients.push(...recipients);
      await list.save();

      // Update contact usage count
      await req.user.updateUsage("contacts", "count", recipients.length);

      res.json({
        list,
        usage: {
          used: currentUsage + newContactsCount,
          limit: totalLimit,
          remaining: totalLimit - (currentUsage + newContactsCount),
        },
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  removeRecipientsFromList: async (req, res) => {
    try {
      const { emails } = req.body;

      const list = await RecipientList.findOne({
        _id: req.params.id,
        user: req.user._id,
      });

      if (!list) {
        return res.status(404).json({ message: "Recipient list not found" });
      }

      const removedCount = list.recipients.filter((r) =>
        emails.includes(r.email)
      ).length;

      // Remove recipients by email
      list.recipients = list.recipients.filter(
        (r) => !emails.includes(r.email)
      );
      await list.save();

      // Update contact usage count
      await req.user.updateUsage("contacts", "count", -removedCount);

      const currentUsage =
        req.user.subscription.usage.contacts.count - removedCount;
      const totalLimit = req.user.getCurrentLimits().contacts;

      res.json({
        list,
        usage: {
          used: currentUsage,
          limit: totalLimit,
          remaining: totalLimit - currentUsage,
        },
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  uploadRecipients: async (req, res) => {
    try {
      const { listName, recipients, tags, description } = req.body;

      if (!Array.isArray(recipients) || recipients.length === 0) {
        return res
          .status(400)
          .json({ message: "Valid recipients data is required" });
      }

      // Check if uploading these contacts would exceed the limit
      const currentUsage = req.user.subscription.usage.contacts.count;
      const newContactsCount = recipients.length;
      const totalLimit = req.user.getCurrentLimits().contacts;

      if (currentUsage + newContactsCount > totalLimit) {
        return res.status(403).json({
          message:
            "Uploading these contacts would exceed your subscription limit",
          currentUsage,
          limit: totalLimit,
          attempting: newContactsCount,
        });
      }

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

      // Update contact usage count
      await req.user.updateUsage("contacts", "count", recipients.length);

      res.status(201).json({
        recipientList,
        usage: {
          used: currentUsage + newContactsCount,
          limit: totalLimit,
          remaining: totalLimit - (currentUsage + newContactsCount),
        },
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Other methods remain unchanged...
  getAllLists: async (req, res) => {
    try {
      const lists = await RecipientList.find({ user: req.user._id })
        .select("-recipients")
        .sort({ createdAt: -1 });

      const currentUsage = req.user.subscription.usage.contacts.count;
      const totalLimit = req.user.getCurrentLimits().contacts;

      res.json({
        lists,
        usage: {
          used: currentUsage,
          limit: totalLimit,
          remaining: totalLimit - currentUsage,
        },
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getListById: async (req, res) => {
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
  },

  deleteList: async (req, res) => {
    try {
      const list = await RecipientList.findOne({
        _id: req.params.id,
        user: req.user._id,
      });

      if (!list) {
        return res.status(404).json({ message: "Recipient list not found" });
      }

      const contactsCount = list.recipients.length;

      await list.remove();

      // Update contact usage count
      await req.user.updateUsage("contacts", "count", -contactsCount);

      const currentUsage =
        req.user.subscription.usage.contacts.count - contactsCount;
      const totalLimit = req.user.getCurrentLimits().contacts;

      res.json({
        message: "Recipient list deleted successfully",
        usage: {
          used: currentUsage,
          limit: totalLimit,
          remaining: totalLimit - currentUsage,
        },
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  updateList: async (req, res) => {
    try {
      const { listName, recipients, tags, description } = req.body;

      const list = await RecipientList.findOne({
        _id: req.params.id,
        user: req.user._id,
      });

      if (!list) {
        return res.status(404).json({ message: "Recipient list not found" });
      }

      // If updating recipients, check contact limits
      if (recipients) {
        const currentUsage = req.user.subscription.usage.contacts.count;
        const difference = recipients.length - list.recipients.length;
        const totalLimit = req.user.getCurrentLimits().contacts;

        if (difference > 0 && currentUsage + difference > totalLimit) {
          return res.status(403).json({
            message:
              "Updating these contacts would exceed your subscription limit",
            currentUsage,
            limit: totalLimit,
            attempting: recipients.length,
            difference,
          });
        }

        // Update contact usage if recipient count changes
        if (difference !== 0) {
          await req.user.updateUsage("contacts", "count", difference);
        }
      }

      // Update fields if provided
      if (listName) list.listName = listName;
      if (recipients) list.recipients = recipients;
      if (tags) list.tags = tags;
      if (description) list.description = description;

      await list.save();

      const currentUsage = req.user.subscription.usage.contacts.count;
      const totalLimit = req.user.getCurrentLimits().contacts;

      res.json({
        list,
        usage: {
          used: currentUsage,
          limit: totalLimit,
          remaining: totalLimit - currentUsage,
        },
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  searchRecipients: async (req, res) => {
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

      // Add usage stats to response
      const currentUsage = req.user.subscription.usage.contacts.count;
      const totalLimit = req.user.getCurrentLimits().contacts;

      res.json({
        lists,
        usage: {
          used: currentUsage,
          limit: totalLimit,
          remaining: totalLimit - currentUsage,
        },
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
};

module.exports = recipientController;