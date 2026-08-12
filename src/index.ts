import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createAgentIqMcpServer } from "./server.js";

const { server } = createAgentIqMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);
