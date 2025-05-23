export interface ScrapePlanArgs {
  target_urls: string[];
  data_requirements: string;
  output_format: 'csv' | 'text' | 'json' | 'markdown';
  complexity_level: 'simple' | 'medium' | 'complex';
  expected_data_volume: 'small' | 'medium' | 'large';
  user_preferences?: string;
} 