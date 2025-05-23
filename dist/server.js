"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const scrape_plan_1 = require("./tools/input/scrape_plan");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8000;
app.use(express_1.default.json());
// Health check endpoint for Smithery
app.get('/health', (_req, res) => {
    res.status(200).send('OK');
});
// MVP tool registration: scrape_plan
app.post('/tools/scrape_plan', scrape_plan_1.scrapePlanHandler);
// TODO: Register additional MCP tools here (sequentialthinking_tools integration)
app.listen(PORT, () => {
    console.log(`TanukiMCP-Scrape server running on port ${PORT}`);
});
