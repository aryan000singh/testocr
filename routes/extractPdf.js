import express from "express";

import {
  getOcrData
} from "../controllers/pdfController.js";

const router = express.Router();
 
router.post("/get", getOcrData); 

export default router;