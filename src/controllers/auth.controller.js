const userModel = require("../models/user.model");
const otpModel = require("../models/otp.model");
const sessionModel = require("../models/session.model");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const env = require("../config/environment");
const generateOtp = require("../utils/otp");
const otpVerificationTemplate = require("../templates/otp-verification");
const sendEmail = require("../services/email.service");

/**
 * Creates a new user account
 *
 * Steps:-
 * - Check existing user
 * - Create user document
 * - Create OTP document
 * - Send email verification
 * - Return response
 */
async function register(req, res) {
  const { name, email, password } = req.body;

  const isExistingUser = await userModel.findOne({ email });
  if (isExistingUser) {
    return res.status(422).json({ message: "Email already exists" });
  }

  const user = await userModel.create({ name, email, password });

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

  await otpModel.create({
    email: user.email,
    user: user._id,
    otpHash,
    purpose: "REGISTRATION",
    expiresAt,
  });

  await sendEmail(
    user.email,
    "Email Verification",
    `Your OTP is: ${otp}`,
    otpVerificationTemplate(otp),
  );

  res.status(201).json({
    message: "User registered successfully",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      verified: user.isEmailVerified,
    },
  });
}

/**
 * Verifies the email for a user
 *
 * Steps:-
 * - Fetch otp document
 * - Verify OTP
 * - Update user verification status
 * - Delete used OTP
 * - Return response
 */
async function verifyEmail(req, res) {
  const { email, otp, purpose } = req.body;

  const otpRecord = await otpModel.findOne({ email, purpose });

  if (!otpRecord) {
    return res.status(404).json({ message: "OTP not found" });
  }

  if (otpRecord.expiresAt < new Date()) {
    return res.status(400).json({ message: "OTP has expired" });
  }

  const isOtpValid = await bcrypt.compare(otp, otpRecord.otpHash);
  if (!isOtpValid) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  const user = await userModel.findById(otpRecord.user);
  user.isEmailVerified = true;
  await user.save();

  await otpModel.deleteMany({ email, purpose });

  res.status(200).json({
    message: "OTP verified successfully",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      verified: user.isEmailVerified,
    },
  });
}

/**
 * Resends an OTP for a specific purpose
 *
 * Steps :-
 * - Check if the purpose is valid
 * - Check if the user exists
 * - Delete existing OTPs for the purpose
 * - Create a new OTP document
 * - Send the new OTP via email
 * - Return response
 */
async function resendOtp(req, res) {
  const { email, purpose } = req.body;

  if (purpose !== "REGISTRATION") {
    return res.status(400).json({ message: "Invalid purpose" });
  }

  const user = await userModel.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.isEmailVerified) {
    return res.status(400).json({ message: "Email is already verified" });
  }

  await otpModel.deleteMany({ email, purpose });

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

  await otpModel.create({
    email: user.email,
    user: user._id,
    otpHash,
    purpose,
    expiresAt,
  });

  await sendEmail(
    user.email,
    "Resend OTP",
    `Your new OTP is: ${otp}`,
    otpVerificationTemplate(otp),
  );

  res.status(200).json({ message: "OTP resent successfully" });
}

/**
 * Logs in a user and creates a session
 *
 * Steps:-
 * - Fetch user by email
 * - Check if email is verified
 * - Verify password
 * - Generate access and refresh tokens
 * - Create a new session document
 * - Return response with access token
 */
async function login(req, res) {
  const { email, password } = req.body;

  const user = await userModel.findOne({ email }).select("+password");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (!user.isEmailVerified) {
    return res.status(400).json({ message: "Email is not verified" });
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(400).json({ message: "Invalid password" });
  }

  const sessionId = crypto.randomUUID();

  const refreshToken = jwt.sign(
    { id: user._id, sessionId },
    env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
    },
  );

  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

  const session = await sessionModel.create({
    user: user._id,
    sessionId: sessionId,
    refreshTokenHash,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });

  const accessToken = jwt.sign(
    { id: user._id, sessionId: session._id },
    env.JWT_SECRET_KEY,
    { expiresIn: "15m" },
  );

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({
    message: "User logged in successfully",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
    accessToken,
  });
}

/**
 * Retrieves the details of the currently authenticated user
 *
 * Steps:-
 * - Extract access token from the request headers
 * - Verify the access token
 * - Fetch the user details from the database
 * - Return response
 */
async function getMe(req, res) {
  const accessToken = req.headers.authorization.split(" ")[1];

  if (!accessToken) {
    return res.status(401).json({ message: "Token not provided" });
  }

  try {
    const decoded = jwt.verify(accessToken, env.JWT_SECRET_KEY);
    if (!decoded) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const user = await userModel.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    res.status(401).json({
      message: "Unable to fetch user details",
      error: error.message,
    });
  }
}

/**
 *
 * Refreshes the access token using a valid refresh token
 *
 * Steps:-
 * - Extract refresh token from cookies
 * - Verify the refresh token
 * - Fetch the session from the database
 * - Generate new access and refresh tokens
 * - Update the session with the new refresh token hash
 * - Return response with new access token
 */
async function refreshToken(req, res) {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ message: "Token not provided" });
  }

  try {
    const decoded = jwt.verify(refreshToken, env.JWT_SECRET_KEY);

    const session = await sessionModel.findOne({
      sessionId: decoded.sessionId,
      revoked: false,
    });

    if (!session) {
      return res.status(400).json({ message: "Invalid session" });
    }

    const isRefreshTokenValid = await bcrypt.compare(
      refreshToken,
      session.refreshTokenHash,
    );

    if (!isRefreshTokenValid) {
      return res.status(400).json({ message: "Invalid refresh token" });
    }

    const newAccessToken = jwt.sign(
      { id: decoded.id, sessionId: session._id },
      env.JWT_SECRET_KEY,
      { expiresIn: "15m" },
    );

    const newRefreshToken = jwt.sign(
      { id: decoded.id, sessionId: session.sessionId },
      env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
      },
    );

    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);

    session.refreshTokenHash = newRefreshTokenHash;
    await session.save();

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Access token refresh successfully",
      accessToken: newAccessToken,
    });
  } catch (error) {
    res.status(400).json({
      message: "Unable to generate access token",
      error: error.message,
    });
  }
}

module.exports = {
  register,
  verifyEmail,
  resendOtp,
  login,
  getMe,
  refreshToken,
};
