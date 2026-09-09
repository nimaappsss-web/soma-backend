import express from "express";
import multer from "multer";
import { uploadImage } from "../controllers/uploadController";
import { authenticateToken } from "../middleware/auth";
import { gateApproval } from "../middleware/approval";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Uploads write school data (avatars, logos) — require an approved school so
// a pending/unknown caller can't push files into the platform.
router.post("/", authenticateToken, gateApproval, upload.single("image"), uploadImage);

export default router;
