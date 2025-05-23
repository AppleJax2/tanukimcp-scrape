"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapePlanHandler = scrapePlanHandler;
function scrapePlanHandler(req, res) {
    // For MVP, just echo back the plan
    const plan = req.body;
    res.json({
        status: 'ok',
        plan,
        message: 'Scrape plan received. (MVP placeholder)'
    });
}
