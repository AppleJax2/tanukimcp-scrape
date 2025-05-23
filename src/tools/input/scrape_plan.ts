// Minimal placeholder for scrape_plan tool
import { Request, Response } from 'express';

export interface ScrapePlanArgs {
  target_urls: string[];
  data_requirements: string;
  output_format: 'csv' | 'text' | 'json' | 'markdown';
  complexity_level: 'simple' | 'medium' | 'complex';
  expected_data_volume: 'small' | 'medium' | 'large';
  user_preferences?: string;
}

export function scrapePlanHandler(req: Request, res: Response) {
  // For MVP, just echo back the plan
  const plan: ScrapePlanArgs = req.body;
  res.json({
    status: 'ok',
    plan,
    message: 'Scrape plan received. (MVP placeholder)'
  });
} 