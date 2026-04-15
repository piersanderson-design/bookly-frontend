# 🚀 Bookly Customer Service Agent
## 📋 Project Overview
Bookly is lookinf for an agentic AI solution to handle customer service queries. The customer service agent should be able to answer basic questions about policies and procedures, as well as handling more complex requests that require interaction with Bookly's various systems and databases. The solution should include the appropriate guardrails to constrain the scope of usage and prevent hallucinations.

This repo contains a basic prototype which runs stand-alone, to demonstrate how we can fulfil Bookly's requirements.

## 🤖 Agent Capabilities
- **Answering generic questions** - based on specific and approved Bookly policies and FAQ responses
- **Check order status** - Provide the customer with real-time order status and delivery dates
- **Locate and verify customer data** - Based on a unique Customer ID, and with guardrails to adhere with security procedures
- **Process refund requests** - Handle refund requests with approval workflow
- **Stay in scope** - Politely decline unrelated questions

## ✨ Key Features
- **Modern chat interface** - Clean chat interface with styled tool outputs, which is composible and extensible via the ShadCN component framework
- **Streaming Responses** - Real-time LLM response streaming a la Claude, ChatGPT etc.
- **Real-time Database Queries** - Direct Neon PostgreSQL integration
- **Tool-based Architecture** - Four specialized database tools to enable the agent to retrieve customer and order data from databases
- **Agent memory** - To ensure continuity of the conversation in the appropriate context
- **Precise prompt engineering** - System prompts to ensure consistent agent behaviour, control the conversation flow and prevent hallucinations

## 🏗️ Architecture and Stack
- **Frontend**: Next.js, React, Tailwind CSS, Radix UI, ShadCN components
- **Backend**: Next.js API routes, OpenAI GPT-4 via Vercel AI SDK v6
- **Database**: PostgreSQL on Neon with postgres library

## 🎯 Design Decisions
- **Lazy database initialization** - Allows build without DATABASE_URL; credentials injected by Vercel
- **Server-side tool execution** - Keeps sensitive operations secure
- **Explicit tool definitions** - Type-safe with Zod schemas
- **Serverless-optimized connection** - 60s timeout for cold starts, 20s idle timeout, 5 max connections
- **Column name mapping** - Maps PostgreSQL lowercase names to camelCase in code
- **Brief system prompt** - Conversational approach lets LLM apply best practices
- **Visual tool output** - Tool results displayed in styled boxes

## 🚘 Test Drive Scenarios!
Navigate to https://bookly-frontend-pied.vercel.app/ in the browser and run a few of these tests...

### Customer Lookup
**Prompt**: "My customer ID is CUST001, can you show me my details?"
**Expected**: Blue box with customer name (Alice Johnson), email, and member date

### Order Status
**Prompt**: "What's the status of order ORD-2024-001?"
**Expected**: Order details showing book title (The Great Gatsby), quantity, status (Shipped), and delivery date

### All Customer Orders
**Prompt**: "Show me all orders for customer CUST002"
**Expected**: List of all orders for Bob Smith with order IDs, books, statuses, and delivery dates

### Out-of-Scope Question
**Prompt**: "What's the capital of France?" or "Can you help me with coding?"
**Expected**: Agent politely declines and redirects to Bookly services

### Invalid Customer ID
**Prompt**: "Show details for customer INVALID999"
**Expected**: Friendly error message saying customer not found

### Invalid Order ID
**Prompt**: "What's the status of order ABC-999999?"
**Expected**: Friendly error message saying order not found


## 🎯 Trade-Offs For Prototyping
1. **Full backend separation**: Ideally the backend would be entirely separated and run on python via pydantic.ai framework and fastAPI endpoints. This would allow for much more sophisticated workflows, better observability and also a way to access the agent through different interfaces such as voice etc. This is a much more portable and flexible architecture, but would take more time to implement reliably.
2. **Multi-agent workflows**: Related to the point above, the Vercel SDK and Typescript in general makes this much more verbose and complex than an object-oriented language like python. Pydantic AI has some fantastic capbabilities here but given time constraints the prototype uses a single agent setup, which is less efficient and more vulnerable to the LLM's arbitrary decisions.
3. **Voice interface**: It would have been great to implement something around this, but more research and time would be required. Ultimately it came down to a decision between UI and voice, and UI seemed the most reliable way to demonstrate the features initially.
4. **Persistent conversations**: In production each conversation would ideally be stored in a database so that it can be retrieved by the user when they return to the site. Along with this comes nice functionality like being able to select previous chats from a sidebar, continue across browser sessions etc. Again, the only thing preventing this is additional development time.
5. **Styling and UI components**: Lots of tradeoffs here that are too numerous to list! The ShadCN framework has some fantastic components that can be composed together in impressive ways, but for now the interface is pretty much bare bones.
