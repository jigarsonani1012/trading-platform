export interface StockQuote {
    symbol: string;
    ticker: string;
    company_name: string;
    last_price: number;
    change: number;
    percent_change: number;
    previous_close: number;
    open: number;
    day_high: number;
    day_low: number;
    year_high: number;
    year_low: number;
    volume: number;
    market_cap: number;
    pe_ratio: number | null;
    currency: string;
    exchange?: string | null;
    timestamp: string;
}

export interface HistoricalDataPoint {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface SearchResult {
    symbol: string;
    company_name: string;
    exchange: string | null;
    type: string;
    category: 'stock' | 'mutual_fund' | 'sip' | 'index';
    type_label: string;
}

export interface StockList {
    id: string;
    name: string;
    symbols: string[];
    userId?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface WebSocketMessage {
    type: 'price' | 'quote' | 'subscribed' | 'unsubscribed';
    symbol: string;
    data?: StockQuote;
}
