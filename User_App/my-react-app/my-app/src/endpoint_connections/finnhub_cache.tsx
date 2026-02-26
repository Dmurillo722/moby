export type CompanyNewsItem = {
  headline?: string;
  source?: string;
  url?: string;
  datetime?: number;
  summary?: string;
};

export type InsiderSentimentResponse = {
  symbol?: string;
  data?: Array<{
    month?: string;
    mspr?: number;
    change?: number;
  }>;
};

export const companyNewsCache = new Map<string, CompanyNewsItem[]>();
export const sentimentCache = new Map<string, InsiderSentimentResponse>();