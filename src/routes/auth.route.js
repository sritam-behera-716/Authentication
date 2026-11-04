const express = require("express");
const authController = require("../controllers/user.controller");

const authRouter = express.Router();

/**
 * Method - POST
 * EndPoint - /api/auth/register
 */
authRouter.post("/register", authController.register);

module.exports = authRouter;
