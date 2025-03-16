const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS
  }
});

const sendVerificationEmail = async (email, fileId, token) => {
  const verificationLink = `http://localhost:5000/api/files/verify/${token}`;
  
  const mailOptions = {
    from: '"SSI Management System" <noreply@ssi.com>',
    to: email,
    subject: "File Verification",
    html: `<p>Please click the link below to verify your file:</p>
           <a href="${verificationLink}">${verificationLink}</a>`
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendVerificationEmail;
