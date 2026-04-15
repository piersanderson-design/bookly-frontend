import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db';

export const getCustomerDetails = tool({
  description:
    'Get customer profile information including name and email address',
  inputSchema: z.object({
    customerId: z
      .string()
      .describe('The customer ID (e.g., CUST001)'),
  }),
  execute: async ({ customerId }) => {
    try {
      console.log(`[getCustomerDetails] Looking up customer: ${customerId}`);
      const user = await db.users.findByCustomerId(customerId);
      console.log(`[getCustomerDetails] Result:`, user);

      if (!user) {
        return `Sorry, I couldn't find a customer with ID "${customerId}". Could you double-check your customer ID?`;
      }

      const memberSince = user.createdAt
        ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'N/A';

      return `Customer Details:\nID: ${user.customerId}\nName: ${user.name}\nEmail: ${user.email}\nMember Since: ${memberSince}`;
    } catch (error) {
      console.error('[getCustomerDetails] Error:', error);
      return `Error looking up customer: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
});
