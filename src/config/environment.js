const dotenv = require("dotenv");

dotenv.config();

if (!process.env.MONGO_DB_URI) {
  throw new Error("MONGO_DB_URI is not defined in environment variables");
}

if (!process.env.CLIENT_ID) {
  throw new Error("CLIENT_ID is not defined in environment variables");
}

if (!process.env.CLIENT_SECRET) {
  throw new Error("CLIENT_SECRET is not defined in environment variables");
}

if (!process.env.REFRESH_TOKEN) {
  throw new Error("REFRESH_TOKEN is not defined in environment variables");
}

if (!process.env.EMAIL_USER) {
  throw new Error("EMAIL_USER is not defined in environment variables");
}

const env = {
  MONGO_DB_URI: process.env.MONGO_DB_URI,
  CLIENT_ID: process.env.CLIENT_ID,
  CLIENT_SECRET: process.env.CLIENT_SECRET,
  REFRESH_TOKEN: process.env.REFRESH_TOKEN,
  EMAIL_USER: process.env.EMAIL_USER,
};

module.exports = env;
