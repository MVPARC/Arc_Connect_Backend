// middleware/auth.js


const jwt = require("jsonwebtoken");
const { User } = require("../model/userModel");
const logger = require("../utils/logger");

const auth = () => async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    logger.info(`[AUTH] Incoming request: ${req.method} ${req.originalUrl}`);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn("[AUTH] Unauthorized: Missing or malformed Bearer token");
      return res.status(401).json({ error: "Authorization required" });
    }

    const token = authHeader.split(" ")[1];
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      logger.warn(`[AUTH] Token verification failed: ${err.message}`);
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Fetch user with a timeout to prevent long DB hangs
    const user = await Promise.race([
      User.findById(decoded.userId).select("-password"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("DB Timeout")), 5000)),
    ]);

    if (!user) {
      logger.warn(`[AUTH] User not found for ID: ${decoded.userId}`);
      return res.status(401).json({ error: "User not found" });
    }

    if (!user.isVerified) {
      logger.warn(`[AUTH] Email not verified for user: ${user.username}`);
      return res.status(401).json({ error: "Email not verified" });
    }

    // Attach user to request
    req.user = user;

    logger.info(`[AUTH] Authenticated: ${user.username}`);
    next();
  } catch (error) {
    logger.error("[AUTH] Middleware error", { error: error.message });
    res.status(500).json({ error: "Authentication failed" });
  }
};

module.exports = auth;




