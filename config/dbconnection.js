/*const mongoose = require("mongoose");
require("dotenv").config();

exports.dbConnect = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL, {});
    console.log("Database connection successfully established");
  } catch (error) {
    console.error("Failed to connect to the database");
    console.log(error);
    throw error; // Rethrow the error to be handled by the caller
  }
};
*/
const mongoose = require("mongoose");
require("dotenv").config();
const logger = require("../utils/logger"); // <- Import logger

exports.dbConnect = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL, {});
    logger.info("Database connection successfully established");
  } catch (error) {
    logger.error("Failed to connect to the database", { error: error.message });
    throw error; // Let the caller handle the failure
  }
};
