const resendOtpTemplate = (otp) => {
  return `
    <div style="font-family: Arial, sans-serif; text-align: center;">
      <h2 style="color: #333;">Your New OTP</h2>

      <p style="font-size: 18px; color: #555;">
        You requested a new verification code. Please use the OTP below to complete your verification.
      </p>

      <div style="font-size: 24px; font-weight: bold; color: #007BFF; margin: 20px 0;">
        ${otp}
      </div>

      <p style="font-size: 14px; color: #999;">
        This OTP is valid for 5 minutes. Your previous OTP is no longer valid.
        Please do not share this code with anyone.
      </p>

      <p style="font-size: 13px; color: #999;">
        If you didn't request this OTP, please ignore this email.
      </p>
    </div>
  `;
};

module.exports = resendOtpTemplate;
