# 🚀 Bookly Customer Service Agent
## 📋 Project Overview
Bookly is an AI-powered customer service chatbot built with Next.js and the Vercel AI SDK. It provides real-time support for the fictitious Bookly online book retailer by querying a PostgreSQL database and leveraging GPT-4 for natural language understanding.
## 🤖 Agent Capabilities
- **Look up customer details** - Retrieve customer information by customer ID
- **Check order status** - View real-time order status and delivery dates
- **View all customer orders** - Display complete order history
- **Process refund requests** - Handle refund requests with approval workflow
- **Answer policy questions** - Provide info about shipping, returns, and refunds
- **Stay in scope** - Politely decline unrelated questions
## ✨ Key Features
- **Real-time Database Queries** - Direct Neon PostgreSQL integration
- **Streaming Responses** - Real-time response streaming
- **Tool-based Architecture** - Four specialized database tools
- **Type-Safe** - Full TypeScript with strict checking
- **Beautiful UI** - Clean chat interface with styled tool outputs
- **Anti-hallucination Safeguards** - System prompt guardrails prevent made-up information
- **Connection Resilience** - Serverless-optimized database configuration
## 🏗️ Architecture and Stack
**Frontend**: Next.js 16 + React 19 + Tailwind CSS 4 + Radix UI
**Backend**: Next.js API routes + OpenAI GPT-4 via AI SDK v6
**Database**: PostgreSQL on Neon with postgres library
## 🎯 Design Decisions
- **Lazy database initialization** - Allows build without DATABASE_URL; credentials injected by Vercel
- **Server-side tool execution** - Keeps sensitive operations secure
- **Explicit tool definitions** - Type-safe with Zod schemas
- **Serverless-optimized connection** - 60s timeout for cold starts, 20s idle timeout, 5 max connections
- **Column name mapping** - Maps PostgreSQL lowercase names to camelCase in code
- **Brief system prompt** - Conversational approach lets LLM apply best practices
- **Visual tool output** - Tool results displayed in styled boxes
## 🧪 Testing Different Scenarios
### Test Customer Lookup
**Prompt**: "My customer ID is CUST001, can you show me my details?"
**Expected**: Blue box with customer name (Alice Johnson), email, and member date
### Test Order Status
**Prompt**: "What's the status of order ORD-2024-001?"
**Expected**: Order details showing book title (The Great Gatsby), quantity, status (Shipped), and delivery date
### Test All Customer Orders
**Prompt**: "Show me all orders for customer CUST002"
**Expected**: List of all orders for Bob Smith with order IDs, books, statuses, and delivery dates
### Test Refund Request
**Prompt**: "I want a refund for order ORD-2024-003, the book arrived damaged"
**Expected**: Yellow approval box appears; once approved, confirmation message with processing timeframe
### Test Out-of-Scope Question
**Prompt**: "What's the capital of France?" or "Can you help me with coding?"
**Expected**: Agent politely declines and redirects to Bookly services
### Test Invalid Customer ID
**Prompt**: "Show details for customer INVALID999"
**Expected**: Friendly error message saying customer not found
### Test Invalid Order ID
**Prompt**: "What's the status of order ABC-999999?"
**Expected**: Friendly error message saying order not found
