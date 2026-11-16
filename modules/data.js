import pool from "./config.js";

const DATA = {
  tonersName: async () => {
    const query = `SELECT toner_name AS "TonerName" FROM toner`;
    const { rows } = await pool.query(query);
    return rows;
  },

  // rename to get colorsByTonerName
  getColorsByTonerName: async (tonerName) => {
    const query = `
      SELECT DISTINCT c.color_name AS "ColorName" 
      FROM color c 
      JOIN toner_stock ts ON ts.color_id = c.color_id 
      JOIN toner t ON ts.toner_id = t.toner_id 
      WHERE t.toner_name = $1
    `;
    const { rows } = await pool.query(query, [tonerName]);
    return rows;
  },

  // new function to get all colors [done]
  getAllColors: async () => {
    const query = `SELECT color_name AS "ColorName" FROM color`;
    const { rows } = await pool.query(query);
    return rows;
  },

  // update requests to return selected columns and order by requested_at descending
  requests: async () => {
    const query = `SELECT * FROM request ORDER BY requested_at DESC`;
    const { rows } = await pool.query(query);
    return rows;
  },
  userRequests: async (userId) => {
    const { rows } = await pool.query(`SELECT * FROM request WHERE requester_user_id=$1 ORDER BY requested_at DESC`, [userId]);
    return rows;
  },
  // create a new function to get all requests data.

  inventory: async () => {
    const query = `
      SELECT ts.stock_id AS "StockID", t.toner_name AS "TonerName", c.color_name AS "ColorName", ts.quantity AS "Quantity"
      FROM toner_stock ts 
      JOIN toner t ON ts.toner_id = t.toner_id 
      JOIN color c ON ts.color_id = c.color_id 
      ORDER BY ts.stock_id
    `;
    const { rows } = await pool.query(query);
    return rows;
  },

  addRequest: async (
    fullName,
    email,
    department,
    tonerName,
    color,
    quantity,
  ) => {
    const username = `${fullName}-${email}`;
    const query = `
      INSERT INTO request (username, department, toner, color, quantity) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING request_id AS "RequestId"
    `;

    const { rows } = await pool.query(query, [
      username,
      department,
      tonerName,
      color,
      quantity,
    ]);

    return rows[0].RequestId;
  },

  getStock: async (tonerName, color) => {
    const query = `
      SELECT ts.stock_id AS "StockId", ts.quantity AS "Quantity" 
      FROM toner_stock ts 
      JOIN toner t ON ts.toner_id = t.toner_id 
      JOIN color c ON ts.color_id = c.color_id 
      WHERE t.toner_name = $1 AND c.color_name = $2
    `;

    const { rows } = await pool.query(query, [tonerName, color]);
    return rows[0] || null;
  },

  updateStock: async (stockId, requestedQuantity) => {
    const query = `
      UPDATE toner_stock 
      SET quantity = quantity - $1 
      WHERE stock_id = $2
    `;

    await pool.query(query, [requestedQuantity, stockId]);
    return true;
  },

  updateStockAdd: async (stockId, quantity) => {
    const query = `
      UPDATE toner_stock 
      SET quantity = quantity + $1 
      WHERE stock_id = $2
    `;

    await pool.query(query, [quantity, stockId]);
    return true;
  },
  // new function to add a new toner to the toner table
  addNewToner: async (tonerName, tonerManufacturer) => {
    const query = `
      INSERT INTO toner (toner_name, manufacturer) 
      VALUES ($1, $2) 
      RETURNING toner_id AS "TonerId"
    `;

    const { rows } = await pool.query(query, [tonerName, tonerManufacturer]);
    return rows[0].TonerId;
  },

  // new function to add a new inventory roll to the toner_stock table
  addNewTonerToInventory: async (tonerId, colorName, quantity) => {
    const colorQuery = `SELECT color_id AS "ColorId" FROM color WHERE color_name = $1`;
    const { rows: colorRows } = await pool.query(colorQuery, [colorName]);
    if (colorRows.length === 0) {
      throw new Error(`Color ${colorName} does not exist in the database.`);
    }
    const colorId = colorRows[0].ColorId;

    const query = `
      INSERT INTO toner_stock (toner_id, color_id, quantity) 
      VALUES ($1, $2, $3) 
      RETURNING stock_id AS "StockId"
    `;

    const { rows: stockRows } = await pool.query(query, [
      tonerId,
      colorId,
      quantity,
    ]);
    return stockRows[0].StockId;
  },
};

export default DATA;
