import express from 'express';
import { scrapePlanHandler } from './tools/input/scrape_plan';

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());

// Health check endpoint for Smithery
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

// MVP tool registration: scrape_plan
app.post('/tools/scrape_plan', scrapePlanHandler);

// TODO: Register additional MCP tools here (sequentialthinking_tools integration)

app.listen(PORT, () => {
  console.log(`TanukiMCP-Scrape server running on port ${PORT}`);
}); 