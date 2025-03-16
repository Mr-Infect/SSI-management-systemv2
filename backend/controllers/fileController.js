const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const File = require("../models/File");
const sendVerificationEmail = require("../config/mail");

// ✅ File Upload
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // Read the uploaded file & generate SHA-256 hash
    const fileBuffer = fs.readFileSync(req.file.path);
    const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    // Check if file already exists
    const existingFile = await File.findOne({ fileHash: hash });
    if (existingFile) {
      return res.status(400).json({ message: "File already uploaded", fileHash: hash });
    }

    // Save file metadata
    const newFile = new File({
      filename: req.file.originalname,
      fileHash: hash,
      uploadedBy: req.user.id
    });

    await newFile.save();

    // Delete file after processing
    fs.unlinkSync(req.file.path);

    res.status(201).json({
      message: "File uploaded successfully",
      fileHash: hash,
      filename: req.file.originalname
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// ✅ Get User's Uploaded Files
exports.getUserFiles = async (req, res) => {
  try {
    const files = await File.find({ uploadedBy: req.user.id }).select("-_id filename fileHash uploadTimestamp verified verificationTimestamp");
    res.json(files);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// ✅ Request File Verification (Send Email)
exports.requestVerification = async (req, res) => {
  try {
    const { fileId } = req.body;

    // Find the file
    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ message: "File not found" });

    if (file.verified) {
      return res.status(400).json({ message: "File already verified" });
    }

    // Generate a unique verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Store the token in the database
    file.verificationToken = verificationToken;
    await file.save();

    // Send verification email
    await sendVerificationEmail(req.user.email, fileId, verificationToken);

    res.json({ message: "Verification email sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// ✅ Verify File using Email Link
exports.verifyFile = async (req, res) => {
  try {
    const { token } = req.params;

    // Find the file by verification token
    const file = await File.findOne({ verificationToken: token });
    if (!file) return res.status(404).json({ message: "Invalid or expired verification token" });

    // Mark file as verified
    file.verified = true;
    file.verificationTimestamp = new Date();
    file.verificationToken = null; // Remove token after verification
    await file.save();

    res.json({ message: "File successfully verified" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// ✅ Share a File with Another User
exports.shareFile = async (req, res) => {
  try {
    const { fileId, recipientEmail } = req.body;

    // Find the file
    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ message: "File not found" });

    // Ensure only the uploader can share the file
    if (file.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to share this file" });
    }

    // Find recipient user
    const User = require("../models/User");
    const recipient = await User.findOne({ email: recipientEmail });
    if (!recipient) return res.status(404).json({ message: "Recipient user not found" });

    // Check if already shared
    if (file.sharedWith.includes(recipient._id)) {
      return res.status(400).json({ message: "File already shared with this user" });
    }

    // Add recipient to sharedWith array
    file.sharedWith.push(recipient._id);
    await file.save();

    res.json({ message: `File shared successfully with ${recipientEmail}` });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// ✅ Get List of Shared Files
exports.getSharedFiles = async (req, res) => {
  try {
    const sharedFiles = await File.find({ sharedWith: req.user.id })
      .populate("uploadedBy", "email username") // Get uploader info
      .select("-_id filename fileHash uploadTimestamp uploadedBy");

    res.json(sharedFiles);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// ✅ Secure File Download
exports.downloadFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    // Find the file
    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ message: "File not found" });

    // Check if the user has permission (owner or shared user)
    if (file.uploadedBy.toString() !== req.user.id && !file.sharedWith.includes(req.user.id)) {
      return res.status(403).json({ message: "Not authorized to download this file" });
    }

    // Generate a dummy file for testing (since actual files are not stored permanently)
    const filePath = path.join(__dirname, "../uploads/", `${file.filename}`);
    fs.writeFileSync(filePath, `This is a test file for ${file.filename}`);

    // Send the file as a download response
    res.download(filePath, file.filename, (err) => {
      if (err) {
        console.error("Error in file download:", err);
        res.status(500).json({ message: "Error downloading file" });
      }

      // Delete the file after sending
      fs.unlinkSync(filePath);
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// ✅ Export all functions
module.exports = {
  uploadFile,
  getUserFiles,
  requestVerification,
  verifyFile,
  shareFile,
  getSharedFiles,
  downloadFile
};
