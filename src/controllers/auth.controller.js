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
 *  Steps:-
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

  await otpModel.deleteMany({ email });

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

module.exports = { register, verifyEmail };
