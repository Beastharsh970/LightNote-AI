import { Router } from "express";
import { upload } from "../middleware/upload";
import {
  createJob,
  getJobStatus,
  getJobOutput,
  healthCheck,
} from "../controllers/jobController";

const router = Router();

// Health check
router.get("/health", healthCheck);

// Job routes
router.post(
  "/jobs",
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "referenceImage", maxCount: 1 },
  ]),
  createJob
);

router.get("/jobs/:jobId", getJobStatus);
router.get("/jobs/:jobId/output", getJobOutput);

export default router;
