import axios from 'axios';
import { getApiBaseUrl } from '../config';
import type { StockQuote, HistoricalDataPoint, SearchResult } from '../types/stock';

const apiClient = axios.create({
    baseURL: getApiBaseUrl(),
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
    const response = await apiClient.get(`/stock/${encodeURIComponent(symbol)}/chart`, {
        params: { range: period, interval }
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