import DATA from "./data.js";
import pool from "./config.js";
import { deliverNotification } from "./notifications.js";

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
    const requests = req.user.role === "Employee" ? await DATA.userRequests(req.user.id) : await DATA.requests();
    res.status(200).json(requests);
  } catch (error) {
    next(error);
  }
};

export const requestToner = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { tonerName, color, quantity } = req.body || {};
    const amount = Number(quantity);
    if (!tonerName || !color || !Number.isInteger(amount) || amount < 1 || amount > 100) return res.status(400).json({success:false,message:"Toner, colour and a quantity from 1 to 100 are required."});
    await client.query("BEGIN");
    const stock = await client.query(`SELECT ts.stock_id,ts.quantity FROM toner_stock ts JOIN toner t USING(toner_id) JOIN color c USING(color_id) WHERE t.toner_name=$1 AND c.color_name=$2 FOR UPDATE`,[tonerName,color]);
    if(!stock.rowCount){await client.query("ROLLBACK");return res.status(404).json({success:false,message:"Toner and colour were not found in inventory."});}
    const status = stock.rows[0].quantity >= amount ? "Approved" : "Pending";
    const username = `${req.user.fullName}-${req.user.email}`;
    const saved = await client.query(`INSERT INTO request(username,department,toner,color,quantity,requester_user_id,status) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING request_id`,[username,req.user.department,tonerName,color,amount,req.user.id,status]);
    if(status === "Approved") await client.query("UPDATE toner_stock SET quantity=quantity-$1 WHERE stock_id=$2",[amount,stock.rows[0].stock_id]);
    const requestId=saved.rows[0].request_id;
    const ictEmail=process.env.ICT_NOTIFICATION_EMAIL;
    if(ictEmail) await client.query("INSERT INTO email_notification(request_id,recipient,notification_type) VALUES($1,$2,'ict') ON CONFLICT(request_id,notification_type) DO NOTHING",[requestId,ictEmail]);
    await client.query("INSERT INTO email_notification(request_id,recipient,notification_type) VALUES($1,$2,'requester') ON CONFLICT(request_id,notification_type) DO NOTHING",[requestId,req.user.email]);
    await client.query("COMMIT");
    setImmediate(async()=>{const {rows}=await pool.query("SELECT notification_id FROM email_notification WHERE request_id=$1 AND status IN ('pending','failed')",[requestId]);for(const row of rows)await deliverNotification(row.notification_id);});
    res.status(201).json({success:true,requestId,message:status === "Approved"?"Request received and inventory updated successfully.":"Request received and is awaiting ICT processing due to insufficient stock.",status});
  } catch (error) {
    await client.query("ROLLBACK").catch(()=>{});
    next(error);
  } finally {client.release();}
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
