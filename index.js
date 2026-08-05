import express from "express";
import cors from "cors";
import router from "./modules/router.js";

const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api", router);

app.use((err, req, res, next) => {
  if (
    err?.status === 400 ||
    err?.statusCode === 400 ||
    err?.type === "entity.parse.failed" ||
    err instanceof SyntaxError
  ) {
    return res.status(400).json({
      success: false,
      message: err.message || "Bad Request",
    });
  }

  next(err);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

app.listen(PORT, () => {
  console.log(PORT);
  console.log(`Server is running on port ${PORT}`);
});
