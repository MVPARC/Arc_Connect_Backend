const swaggerJsdoc = require("swagger-jsdoc");
const path = require("path");

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
  },
  apis: [path.join(__dirname, "../routes/*.js")], // ✅ Correct absolute path
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
