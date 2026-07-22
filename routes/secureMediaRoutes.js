import express from "express";

import {
  saveMedia, 
  getAllMedia,
  getRandomMedia
} from "../controllers/mediaController.js";

const router = express.Router();
 
router.post("/get-random", getRandomMedia);
router.post("/get-all", getAllMedia);


export default router;