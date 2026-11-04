const mongoose = require("mongoose");
const env = require("./environment");

async function connectToDatabase() {
  try {
    await mongoose.connect(env.MONGO_DB_URI);
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection failed: ", error);
    process.exit(1);
  }
}

module.exports = connectToDatabase;
