import express from "express";

import {
  saveMedia,   
  deleteOldMedia
} from "../controllers/mediaController.js";

const router = express.Router();

router.post("/save", saveMedia); 
router.get("/deleteOld",deleteOldMedia);

export default router;