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
    const { name, email, department, tonerName, color, quantity } = req.body;

    const requestId = await DATA.addRequest(
      name,
      email,
      department,
      tonerName,
      color,
      quantity,
    );
    console.log(requestId);
    // DATA.getStock expects (tonerName, color).
    const availableStock = await DATA.getStock(tonerName, color);

    if (!availableStock) {
      return res.status(404).json({
        success: false,
        message: "Request logged, but toner does not exist in inventory.",
      });
    }

    // treat equal quantity as sufficient to fulfill the request
    if (availableStock.Quantity >= quantity) {
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
      return res
        .status(400)
        .json({ success: false, message: "Toner name is required" });
    const colors = await DATA.getColorsByTonerName(tonerName);
    if (!colors || colors.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No colors found for the specified toner",
      });
    }
    res.status(200).json(colors);
  } catch (error) {
    next(error);
  }
};

export const getAllColors = async (req, res, next) => {
  try {
    const colors = await DATA.getAllColors();
    res.status(200).json(colors);
  } catch (error) {
    next(error);
  }
};

export const addNewToner = async (req, res, next) => {
  try {
    const { tonerName, tonerManufacturer, color, quantity } = req.body;

    // check if toner already exists
    const existingToner = await DATA.getStock(tonerName, color);
    if (existingToner) {
      return res.status(400).json({
        success: false,
        message: "Toner with the specified color already exists in inventory.",
      });
    }

    const newTonerId = await DATA.addNewToner(tonerName, tonerManufacturer);
   

    if (!newTonerId) {
      return res.status(400).json({
        success: false,
        message: "Failed to add new toner. Please check your inputs.",
      });
    }
    // add new stock entry for the new toner
    await DATA.addNewTonerToInventory(newTonerId, color, quantity);
    res.status(200).json({
      success: true,
      message: `New toner added: ${tonerName} - ${color}, Quantity: ${quantity}`,
    });
  } catch (error) {
    next(error);
  }
};
