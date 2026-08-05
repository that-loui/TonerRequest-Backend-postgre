import pool from "./config.js";

const DATA = {
  tonersName: async () => {
    const query = `SELECT toner_name AS "TonerName" FROM toner`;
    const { rows } = await pool.query(query);
    return rows;
  },

  getColors: async (tonerName) => {
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

  requests: async () => {
    const query = `SELECT * FROM request ORDER BY requested_at DESC`;
    const { rows } = await pool.query(query);
    return rows;
  },

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
    quantity
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
};

export default DATA;