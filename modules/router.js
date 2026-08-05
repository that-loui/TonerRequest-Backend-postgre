


import express from "express";

import {
  getTonerData,
  getInventoryData,
  getRequestData,
  requestToner,
  updateInventory,
  getColorFromToner,
} from "./controller.js";

const router = express.Router();

// admin routes
router.get("/inventory", getInventoryData);
router.get("/requests", getRequestData);
router.post("/addToInventory", updateInventory);

// request Routes
router.get("/toners", getTonerData);
router.get("/colors", getColorFromToner);
router.post("/request", requestToner);

export default router;
