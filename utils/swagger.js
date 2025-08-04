const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Email Marketing API",
      version: "1.0.0",
      description: "RESTful API documentation for your Email Marketing backend",
      contact: {
        name: "Your Team Name",
        email: "support@yourdomain.com",
        url: "https://yourdomain.com",
      },
    },
    servers: [
      {
        url: "http://localhost:8081/api",
        description: "Local development server",
      },
      // Optional: Add production or staging server here
      // {
      //   url: "https://api.yourdomain.com",
      //   description: "Production server",
      // },
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
    security: [{ bearerAuth: [] }],
  },
  apis: ["./routes/**/*.js"], // Glob for all annotated routes
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
