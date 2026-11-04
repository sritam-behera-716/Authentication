const userModel = require("../models/user.model");
const otpModel = require("../models/otp.model");
const bcrypt = require("bcrypt");
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

module.exports = { register, verifyEmail, resendOtp };
