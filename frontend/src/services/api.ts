import axios from 'axios';
import type { StockQuote, HistoricalDataPoint, SearchResult } from '../types/stock';

const API_BASE_URL = 'http://localhost:5000/api';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
});

export const fetchStock = async (symbol: string): Promise<StockQuote> => {
    const response = await apiClient.get(`/stock/${encodeURIComponent(symbol)}`);
    return response.data.data;
};

export const fetchHistoricalData = async (
    symbol: string,
    period: string = '1mo',
    interval: string = '1d'
): Promise<HistoricalDataPoint[]> => {
    const response = await apiClient.get(`/stock/${encodeURIComponent(symbol)}/history`, {
        params: { period, interval }
    });
    return response.data.data;
};

export const searchStocks = async (query: string): Promise<SearchResult[]> => {
    const response = await apiClient.get('/search', { params: { q: query } });
    return response.data.results;
};

export const fetchMultipleStocks = async (symbols: string[]): Promise<StockQuote[]> => {
    const response = await apiClient.post('/stocks', { symbols });
    return response.data.results;
};
