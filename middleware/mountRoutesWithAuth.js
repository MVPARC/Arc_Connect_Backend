const express = require("express");

const mountRoutesWithAuth = (originalRouter, authMiddleware) => {
  const securedRouter = express.Router();

  // Apply auth middleware to all routes in the router
  securedRouter.use(authMiddleware);

  // Use the original router
  securedRouter.use(originalRouter);

  return securedRouter;
};

module.exports = mountRoutesWithAuth;
