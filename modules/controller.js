import { json } from "express";
import DATA from "./data.js";

export const getTonerData = async (req, res, next) => {
  try {
    const toners = await DATA.tonersName();
    res.status(200).json(toners);
  } catch (error) {
    next(error);
  }
};

export const getInventoryData = async (req, res, next) => {
  try {
    const inventory = await DATA.inventory();
    res.status(200).json(inventory);
  } catch (error) {
    next(error);
  }
};

export const getRequestData = async (req, res, next) => {
  try {
    const requests = await DATA.requests();
    res.status(200).json(requests);
  } catch (error) {
    next(error);
  }
};

export const requestToner = async (req, res, next) => {
  try {
    const { name, email, department, tonerId, color, quantity } = req.body;
    const requestId = await DATA.addRequest(
      name,
      email,
      department,
      tonerId,
      color,
      quantity,
    );
    console.log(requestId);
    const availableStock = await DATA.getStock(tonerId, color);

    if (!availableStock) {
      return res.status(404).json({
        success: false,
        message: "Request logged, but toner does not exist in inventory.",
      });
    }

    if (availableStock.Quantity > quantity) {
      await DATA.updateStock(availableStock.StockId, quantity);
      res.status(200).json({
        success: true,
        message: "Request logged and inventory updated successfully.",
      });
    } else {
      return res.status(200).json({
        success: true,
        message:
          "Request logged successfully. Awaiting ICT processing due to insufficient stock.",
      });
    }
  } catch (error) {
    next(error);
  }
};

export const updateInventory = async (req, res, next) => {
  try {
    const { tonerName, color, quantity } = req.body;

    const availableStock = await DATA.getStock(tonerName, color);
    if (!availableStock) {
      return res.status(404).json({
        success: false,
        message:
          "Stock does not exist in inventory, Kindly check your inputs or contact database administrator.",
      });
    } else {
      await DATA.updateStockAdd(availableStock.StockId, quantity);
      res.status(200).json({
        success: true,
        message: `Inventory updated: ${tonerName} - ${color}, +${quantity}`,
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getColorFromToner = async (req, res, next) => {
  try {
    const { tonerName } = req.query;
    if (!tonerName)
      res
        .status(400)
        .json({ success: false, message: "Toner name is required" });
    const colors = await DATA.getColors(tonerName);
    if (!colors || colors.length === 0)
      res.status(404).json({
        success: false,
        message: "No colors found for the specified toner",
      });
    res.status(200).json(colors);
  } catch (error) {
    next(error);
  }
};
