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

module.exports = { register };
