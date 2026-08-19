import express from "express";
import multer from "multer";
import { uploadImage } from "../controllers/uploadController";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post("/", upload.single("image"), uploadImage);

export default router;
