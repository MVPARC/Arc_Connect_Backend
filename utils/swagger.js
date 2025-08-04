const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Email Marketing API",
      version: "1.0.0",
      description: "RESTful API documentation for the Email Marketing backend",
      contact: {
        name: "Arc Connect Team",
        email: "support@arcconnect.com",
        url: "https://arcconnect.com",
      },
    },
    servers: [
      {
        url: "https://arc-connect-backend-aaemf7ash8fvhwhu.centralindia-01.azurewebsites.net/api",
        description: "Azure Production Server",
      },
      {
        url: "http://localhost:8081/api",
        description: "Local Development Server",
      },
    ],
    tags: [
      { name: "Auth", description: "Authentication & Authorization" },
      { name: "Users", description: "User profile and subscription" },
      { name: "Templates", description: "Email templates management" },
      { name: "Recipients", description: "Recipient lists & uploads" },
      { name: "Campaigns", description: "Email campaigns" },
      { name: "Reports", description: "Analytics and reports" },
      { name: "Tracking", description: "Open & click tracking" },
      { name: "Storage", description: "Image & file uploads" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },

  // ✅ Ensure correct path resolution regardless of working directory
  apis: [__dirname + "/../routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
