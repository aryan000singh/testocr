import express from "express";
import cors from "cors";
import serverless from "serverless-http";

import connectDB from "../../config/db.js";
import mediaRoutes from "../../routes/mediaRoutes.js";
import secureMediaRoutes from "../../routes/secureMediaRoutes.js";
import extractPdf from "../../routes/extractPdf.js";
import verifyToken from "../../middleware/verifyJwt.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use(async (req, res, next) => {
  try {
    // await connectDB();
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

// app.use("/api/media", mediaRoutes);
app.use("/api/extract",extractPdf);
// app.use("/api/secure", secureMediaRoutes)
app.get("/api/test", async (req, res) => {
  return res.status(200).json({
    success: true,
    count: 22,
  });
});
export const handler = serverless(app);