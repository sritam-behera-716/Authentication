const express = require("express");
const authController = require("../controllers/auth.controller");

const authRouter = express.Router();

/**
 * Method - POST
 * EndPoint - /api/auth/register
 */
authRouter.post("/register", authController.register);

/**
 * Method - POST
 * EndPoint - /api/auth/verify-email
 */
authRouter.post("/verify-email", authController.verifyEmail);

module.exports = authRouter;
