const mongoose = require("mongoose");

const FileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  fileHash: { type: String, required: true, unique: true },
  uploadTimestamp: { type: Date, default: Date.now },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  verified: { type: Boolean, default: false },
  verificationToken: { type: String, unique: true, sparse: true },
  verificationTimestamp: { type: Date },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }] // ✅ New field for shared users
});

module.exports = mongoose.model("File", FileSchema);
