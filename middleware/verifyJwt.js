import jwt from "jsonwebtoken";

const verifyJWT = (req, res, next) => {
      const token = req.headers["x-secure-token"];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Missing token",
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    req.tokenPayload = payload;

    next();
  } catch (error) {
    console.error("JWT verification failed:", error.message);

    return res.status(401).json({
      success: false,
      error: "Invalid or expired token",
    });
  }
};

export default verifyJWT;