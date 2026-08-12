


import express from "express";

import {
  getTonerData,
  getInventoryData,
  getRequestData,
  requestToner,
  updateInventory,
  getColorFromToner,
  getAllColors,
  addNewToner,
} from "./controller.js";

const router = express.Router();

// admin routes
router.get("/inventory", getInventoryData);
router.get("/requests", getRequestData);
router.post("/addToInventory", updateInventory);
router.post("/addToner", addNewToner);

// request Routes
router.get("/toners", getTonerData);
router.get("/colors", getColorFromToner);
router.post("/request", requestToner);
router.get("/allColors", getAllColors);

export default router;
