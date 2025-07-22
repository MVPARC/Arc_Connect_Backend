// middleware/checkRole.js
/*const checkRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  };
};

module.exports = checkRole;*/
const logger = require("../utils/logger");

const checkRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      logger.warn(`Access denied for ${req.user.username} with role ${req.user.role}`);
      return res.status(403).json({ error: "Access denied" });
    }

    logger.info(`Role check passed for ${req.user.username}`);
    next();
  };
};

module.exports = checkRole;

