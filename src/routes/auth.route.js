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

/**
 * Method - GET
 * EndPoint - /api/auth/me
 */
authRouter.get("/me", authController.getMe);

/**
 * Method - POST
 * EndPoint - /api/auth/refresh-token
 */
authRouter.post("/refresh-token", authController.refreshToken);

/**
 * Method - POST
 * EndPoint - /api/auth/logout
 */
authRouter.post("/logout", authController.logout);

module.exports = authRouter;
