import axios from 'axios';
import { getApiBaseUrl } from '../config';

const apiClient = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 15000,
});

export interface ChartDataPoint {
    time: number; // Unix timestamp in seconds
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface ChartResponse {
    status: string;
    symbol: string;
    range: string;
    interval: string;
    data: ChartDataPoint[];
    currentPrice: number;
    companyName: string;
}

export const fetchChartData = async (
    symbol: string,
    range: string = '1mo',
    interval: string = '1d'
): Promise<ChartResponse> => {
    const response = await apiClient.get(`/stock/${encodeURIComponent(symbol)}/chart`, {
        params: { range, interval }
    });
    return response.data;
};