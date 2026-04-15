import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db';

export const getOrderStatus = tool({
  description: 'Get the status of a specific order by order ID',
  inputSchema: z.object({
    orderId: z.string().describe('The order ID (e.g., ORD-2024-001)'),
  }),
  execute: async ({ orderId }) => {
    try {
      console.log(`[getOrderStatus] Looking up order: ${orderId}`);
      const order = await db.orders.findByOrderId(orderId);
      console.log(`[getOrderStatus] Result:`, order);

      if (!order) {
        return `I couldn't find an order with ID "${orderId}". Could you verify the order ID?`;
      }

      const orderDate = order.orderDate 
        ? new Date(order.orderDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'N/A';
      const estimatedDelivery = order.estimatedDelivery
        ? new Date(order.estimatedDelivery).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'N/A';

      return `Order Details:\nID: ${order.orderId}\nBook: ${order.bookTitle}\nQuantity: ${order.quantity}\nStatus: ${order.status}\nOrder Date: ${orderDate}\nEstimated Delivery: ${estimatedDelivery}`;
    } catch (error) {
      console.error('[getOrderStatus] Error:', error);
      return `Error looking up order: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
});

export const getAllCustomerOrders = tool({
  description:
    'Get all orders for a specific customer by their customer ID',
  inputSchema: z.object({
    customerId: z
      .string()
      .describe('The customer ID (e.g., CUST001)'),
  }),
  execute: async ({ customerId }) => {
    try {
      console.log(`[getAllCustomerOrders] Looking up orders for: ${customerId}`);
      const orders = await db.orders.findByCustomerId(customerId);
      console.log(`[getAllCustomerOrders] Result count:`, orders.length);

      if (orders.length === 0) {
        return `No orders found for customer "${customerId}".`;
      }

      const orderList = orders
        .map((order) => {
          const orderDate = order.orderDate
            ? new Date(order.orderDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            : 'N/A';
          const estimatedDelivery = order.estimatedDelivery
            ? new Date(order.estimatedDelivery).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            : 'N/A';
          return `${order.orderId}: ${order.bookTitle} (Qty: ${order.quantity}, Status: ${order.status}, Delivery: ${estimatedDelivery})`;
        })
        .join('\n');

      return `Orders for ${customerId}:\n${orderList}`;
    } catch (error) {
      console.error('[getAllCustomerOrders] Error:', error);
      return `Error retrieving orders: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
});

export const processRefundRequest = tool({
  description:
    'Process a refund request for an order. Requires customer approval before execution.',
  inputSchema: z.object({
    orderId: z.string().describe('The order ID to refund (e.g., ORD-2024-001)'),
    reason: z
      .string()
      .describe('The reason for the refund request'),
  }),
  needsApproval: true,
  execute: async ({ orderId, reason }) => {
    try {
      console.log(`[processRefundRequest] Processing refund for: ${orderId}`);
      const order = await db.orders.findByOrderId(orderId);
      console.log(`[processRefundRequest] Found order:`, !!order);

      if (!order) {
        return `Order "${orderId}" not found.`;
      }

      console.log(`[processRefundRequest] Updating status to Refund Requested`);
      const updatedOrder = await db.orders.updateStatus(
        orderId,
        'Refund Requested'
      );
      console.log(`[processRefundRequest] Update successful`);

      if (!updatedOrder) {
        return `Failed to update order status for "${orderId}".`;
      }

      const processedAt = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

      return `Refund Request Approved!\nOrder: ${orderId}\nReason: ${reason}\nNew Status: ${updatedOrder.status}\nProcessed: ${processedAt}\n\nYour refund will be processed within 5-7 business days.`;
    } catch (error) {
      console.error('[processRefundRequest] Error:', error);
      return `Error processing refund: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
});
