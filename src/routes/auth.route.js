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

/**
 * Method - POST
 * EndPoint - /api/auth/resend-otp
 */
authRouter.post("/resend-otp", authController.resendOtp);

/**
 * Method - POST
 * EndPoint - /api/auth/login
 */
authRouter.post("/login", authController.login);

module.exports = authRouter;
