import postgres from 'postgres';

let sql: ReturnType<typeof postgres> | null = null;

function getSql() {
  if (sql) {
    return sql;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL environment variable is not set. Please add it to .env.local or configure Neon integration in Vercel.'
    );
  }

  // Create postgres client with Neon-optimized configuration
  // - connect_timeout: 60s allows Neon compute to wake up (cold starts take 1-3s)
  // - idle_timeout: 20s closes unused connections to prevent pool exhaustion
  // - max_lifetime: 30 minutes for connection reuse
  // - max: 5 connections for serverless environment
  sql = postgres(connectionString, {
    ssl: 'require',
    connect_timeout: 60,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    max: 5,
  });

  return sql;
}

// Helper functions for database queries
// Note: PostgreSQL returns lowercase column names, so we map them to camelCase
export const db = {
  users: {
    findByCustomerId: async (customerId: string) => {
      const result = await getSql()`
        SELECT id, customerid, name, email, createdat
        FROM users
        WHERE customerid = ${customerId}
      `;
      if (!result[0]) return null;
      // Map lowercase columns to camelCase
      return {
        id: result[0].id,
        customerId: result[0].customerid,
        name: result[0].name,
        email: result[0].email,
        createdAt: result[0].createdat,
      };
    },
  },
  orders: {
    findByOrderId: async (orderId: string) => {
      const result = await getSql()`
        SELECT * FROM orders WHERE orderid = ${orderId}
      `;
      if (!result[0]) return null;
      return mapOrderRow(result[0]);
    },
    findByCustomerId: async (customerId: string) => {
      const result = await getSql()`
        SELECT * FROM orders WHERE customerid = ${customerId}
        ORDER BY orderdate DESC
      `;
      return result.map(mapOrderRow);
    },
    updateStatus: async (orderId: string, status: string) => {
      const result = await getSql()`
        UPDATE orders
        SET status = ${status}
        WHERE orderid = ${orderId}
        RETURNING *
      `;
      if (!result[0]) return null;
      return mapOrderRow(result[0]);
    },
  },
};

// Helper to map order rows from lowercase to camelCase
function mapOrderRow(row: any) {
  return {
    id: row.id,
    orderId: row.orderid,
    customerId: row.customerid,
    bookTitle: row.booktitle,
    quantity: row.quantity,
    status: row.status,
    orderDate: row.orderdate,
    estimatedDelivery: row.estimateddelivery,
  };
}
