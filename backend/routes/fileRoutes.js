const express = require("express");
const { uploadFile, getUserFiles, requestVerification, verifyFile, shareFile, getSharedFiles, downloadFile } = require("../controllers/fileController");
const { protect } = require("../middleware/authMiddleware");
const multer = require("multer");

const router = express.Router();

// Configure Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

// ✅ File Upload Route (Protected)
router.post("/upload", protect, upload.single("file"), uploadFile);

// ✅ Get User's Uploaded Files (Protected)
router.get("/files", protect, getUserFiles);

// ✅ Request File Verification (Protected)
router.post("/request-verification", protect, requestVerification);

// ✅ Verify File via Email Link (Public)
router.get("/verify/:token", verifyFile);

// ✅ Share File with Another User (Protected)
router.post("/share", protect, shareFile);

// ✅ Get Files Shared with User (Protected)
router.get("/shared-files", protect, getSharedFiles);

// ✅ Secure File Download (Protected)
router.get("/download/:fileId", protect, downloadFile);

module.exports = router;
