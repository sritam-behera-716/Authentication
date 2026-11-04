const dotenv = require("dotenv");

dotenv.config();

if (!process.env.MONGO_DB_URI) {
  throw new Error("MONGO_DB_URI is not defined in environment variables");
}

const env = {
  MONGO_DB_URI: process.env.MONGO_DB_URI,
};

module.exports = env;
