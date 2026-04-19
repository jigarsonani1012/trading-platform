import axios from 'axios';
import { getApiBaseUrl } from '../config';
import type { StockQuote, HistoricalDataPoint, SearchResult, StockList } from '../types/stock';

export class ApiError extends Error {
    status?: number;

    constructor(message: string, status?: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

const apiClient = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 10000,
});

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status as number | undefined;
        const message =
            error.response?.data?.error ||
            error.response?.data?.message ||
            error.message ||
            'Something went wrong while contacting the server';

        return Promise.reject(new ApiError(message, status));
    }
);

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
        params: { range: period, interval },
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

export const fetchLists = async (userId: string): Promise<StockList[]> => {
    const response = await apiClient.get('/lists', { params: { userId } });
    return response.data.lists;
};

export const createList = async (userId: string, name: string): Promise<StockList> => {
    const response = await apiClient.post('/lists', { userId, name });
    return response.data.list;
};

export const renameList = async (listId: string, userId: string, name: string): Promise<StockList> => {
    const response = await apiClient.patch(`/lists/${encodeURIComponent(listId)}`, { userId, name });
    return response.data.list;
};

export const deleteList = async (listId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/lists/${encodeURIComponent(listId)}`, { params: { userId } });
};

export const addSymbolToSavedList = async (listId: string, userId: string, symbol: string): Promise<StockList> => {
    const response = await apiClient.post(`/lists/${encodeURIComponent(listId)}/symbols`, { userId, symbol });
    return response.data.list;
};

export const removeSymbolFromSavedList = async (listId: string, userId: string, symbol: string): Promise<StockList> => {
    const response = await apiClient.delete(`/lists/${encodeURIComponent(listId)}/symbols/${encodeURIComponent(symbol)}`, {
        params: { userId },
    });
    return response.data.list;
};

export interface ListLookupResponse {
    success: boolean;
    type: 'local' | 'shared';
    list: StockList;
}

export interface ShareListResponse {
    success: boolean;
    shareId: string;
    shareUrl: string;
    expiresAt?: string;
    isExisting?: boolean;
}

export interface SharedListResponse {
    success: boolean;
    list: {
        shareId: string;
        listName: string;
        symbols: string[];
        description: string;
        createdAt: string;
        views: number;
    };
}

export const fetchListById = async (listId: string, userId: string): Promise<ListLookupResponse> => {
    const response = await apiClient.get(`/list/${encodeURIComponent(listId)}`, {
        params: { userId },
    });
    return response.data;
};

export const createShareLink = async (
    listId: string,
    listName: string,
    symbols: string[],
    userId: string,
    expiresInDays: number = 7
): Promise<ShareListResponse> => {
    const response = await apiClient.post('/share', {
        listId,
        listName,
        symbols,
        userId,
        expiresInDays,
    });
    return response.data;
};

export const fetchSharedList = async (shareId: string): Promise<SharedListResponse> => {
    const response = await apiClient.get(`/share/${encodeURIComponent(shareId)}`);
    return response.data;
};
