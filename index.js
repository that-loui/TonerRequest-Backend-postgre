import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./modules/router.js";

const app = express();
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
  .split(",").map((origin) => origin.trim());
app.set("trust proxy", 1);
app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)), credentials: true }));
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());
app.use("/api", router);
app.use((err, req, res, next) => {
  if (err?.type === "entity.parse.failed" || err instanceof SyntaxError) return res.status(400).json({ success: false, message: "Invalid JSON body." });
  console.error(err);
  res.status(err.status || 500).json({ success: false, message: err.status ? err.message : "Internal server error." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`TRMS API listening on port ${PORT}`));
