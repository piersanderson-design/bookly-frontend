import { getCustomerDetails } from './users';
import {
  getOrderStatus,
  getAllCustomerOrders,
  processRefundRequest,
} from './orders';

export const booklyTools = {
  getCustomerDetails,
  getOrderStatus,
  getAllCustomerOrders,
  processRefundRequest,
};
