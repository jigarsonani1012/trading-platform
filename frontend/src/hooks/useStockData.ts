import { formatForCreation, formatForEdit, validateListName } from '../utils/textUtils';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    addSymbolToSavedList,
    createList as createSavedList,
    deleteList as deleteSavedList,
    fetchHistoricalData,
    fetchLists,
    fetchStock,
    removeSymbolFromSavedList,
    renameList,
    searchStocks,
} from '../services/api';
import type { HistoricalDataPoint, SearchResult, StockList, StockQuote } from '../types/stock';
import toast from 'react-hot-toast';
import { getUserId } from '../utils/userSession';
import { logger } from '../utils/logger';

const ACTIVE_LIST_STORAGE_KEY = 'active-stock-list-id';

const readActiveListId = () => {
    if (typeof window === 'undefined') {
        return '';
    }

    return window.localStorage.getItem(ACTIVE_LIST_STORAGE_KEY) || '';
};

const writeActiveListId = (value: string) => {
    if (typeof window === 'undefined') {
        return;
    }

    if (value) {
        window.localStorage.setItem(ACTIVE_LIST_STORAGE_KEY, value);
        return;
    }

    window.localStorage.removeItem(ACTIVE_LIST_STORAGE_KEY);
};

export const useStock = (symbol: string | null) => {
    return useQuery<StockQuote>({
        queryKey: ['stock', symbol],
        queryFn: () => fetchStock(symbol!),
        enabled: !!symbol && symbol.trim().length > 0,
        staleTime: 30000,
        retry: 2,
    });
};

export const useStockSearch = (searchTerm: string) => {
    return useQuery<SearchResult[]>({
        queryKey: ['search', searchTerm],
        queryFn: () => searchStocks(searchTerm),
        enabled: searchTerm.trim().length >= 2,
        staleTime: 60000,
    });
};

export const useHistoricalData = (symbol: string | null, period: string = '1mo', interval: string = '1d') => {
    return useQuery<HistoricalDataPoint[]>({
        queryKey: ['history', symbol, period, interval],
        queryFn: () => fetchHistoricalData(symbol!, period, interval),
        enabled: !!symbol,
        staleTime: 5 * 60 * 1000,
    });
};

export const useStockLists = () => {
    const queryClient = useQueryClient();
    const userId = getUserId();
    const [activeListId, setActiveListIdState] = useState(() => readActiveListId());

    const { data: lists = [], isLoading, error } = useQuery<StockList[]>({
        queryKey: ['stockLists', userId],
        queryFn: () => fetchLists(userId),
        staleTime: 30000,
    });

    const setListsCache = (updater: (current: StockList[]) => StockList[]) => {
        queryClient.setQueryData<StockList[]>(['stockLists', userId], (current = []) => updater(current));
    };

    const setActiveList = (listId: string) => {
        setActiveListIdState(listId);
        writeActiveListId(listId);
    };

    const createList = async (name: string) => {
        const formatted = formatForCreation(name);

        if (!formatted) {
            toast.error('Please enter a valid list name');
            return null;
        }

        const validation = validateListName(formatted, lists.map((list) => list.name));
        if (!validation.isValid) {
            toast.error(validation.error);
            return null;
        }

        try {
            const created = await createSavedList(userId, formatted);
            setListsCache((current) => [...current, created]);
            setActiveList(created.id);
            toast.success(`${formatted} created`);
            return created;
        } catch (error) {
            logger.error('Create list error', error);
            toast.error('Failed to create list');
            return null;
        }
    };

    const removeList = async (listId: string) => {
        try {
            await deleteSavedList(listId, userId);
            const nextLists = lists.filter((list) => list.id !== listId);
            setListsCache((current) => current.filter((list) => list.id !== listId));
            const nextActiveListId = activeListId === listId ? (nextLists[0]?.id || '') : activeListId;
            setActiveList(nextActiveListId);
            queryClient.removeQueries({ queryKey: ['listStocks', listId] });
            return true;
        } catch (error) {
            logger.error('Delete list error', error);
            toast.error('Failed to delete list');
            return false;
        }
    };

    const addSymbolToList = async (symbol: string, listId: string = activeListId) => {
        const normalized = symbol.trim().toUpperCase();
        if (!normalized) {
            return false;
        }

        const targetList = lists.find((list) => list.id === listId);
        if (!targetList || targetList.symbols.includes(normalized)) {
            return false;
        }

        try {
            const updatedList = await addSymbolToSavedList(listId, userId, normalized);
            setListsCache((current) => current.map((list) => (list.id === listId ? updatedList : list)));

            const currentStocks = queryClient.getQueryData<StockQuote[]>(['listStocks', targetList.id, targetList.symbols]) ?? [];
            queryClient.setQueryData<StockQuote[]>(['listStocks', updatedList.id, updatedList.symbols], currentStocks);
            return true;
        } catch (error) {
            logger.error('Add symbol error', error);
            toast.error('Failed to save symbol');
            return false;
        }
    };

    const removeSymbolFromList = async (symbol: string, listId: string = activeListId) => {
        const normalized = symbol.trim().toUpperCase();
        const targetList = lists.find((list) => list.id === listId);

        if (!targetList) {
            return false;
        }

        try {
            const updatedList = await removeSymbolFromSavedList(listId, userId, normalized);
            const currentStocks = queryClient.getQueryData<StockQuote[]>(['listStocks', targetList.id, targetList.symbols]) ?? [];
            const nextStocks = currentStocks.filter((stock) => stock.symbol !== normalized);

            setListsCache((current) => current.map((list) => (list.id === listId ? updatedList : list)));
            queryClient.setQueriesData<StockQuote[]>({ queryKey: ['listStocks', listId] }, (current = []) =>
                current.filter((stock) => stock.symbol !== normalized)
            );
            queryClient.setQueryData<StockQuote[]>(['listStocks', listId, updatedList.symbols], nextStocks);
            return true;
        } catch (error) {
            logger.error('Remove symbol error', error);
            toast.error('Failed to remove symbol');
            return false;
        }
    };

    const updateListName = async (listId: string, newName: string) => {
        const formatted = formatForEdit(newName);

        if (!formatted) {
            toast.error('List name cannot be empty');
            return false;
        }

        const existingNames = lists.filter((list) => list.id !== listId).map((list) => list.name);
        const validation = validateListName(formatted, existingNames);
        if (!validation.isValid) {
            toast.error(validation.error);
            return false;
        }

        const targetList = lists.find((list) => list.id === listId);
        if (targetList?.name === formatted) {
            toast.error('New name is the same as current name');
            return false;
        }

        try {
            const updated = await renameList(listId, userId, formatted);
            setListsCache((current) => current.map((list) => (list.id === listId ? updated : list)));
            queryClient.invalidateQueries({ queryKey: ['listStocks', listId] });
            toast.success(`List renamed to "${formatted}"`);
            return true;
        } catch (error) {
            logger.error('Rename list error', error);
            toast.error('Failed to rename list');
            return false;
        }
    };

    const activeList = lists.find((list) => list.id === activeListId) ?? lists[0] ?? null;

    useEffect(() => {
        writeActiveListId(activeList?.id ?? '');
    }, [activeList?.id]);

    return {
        userId,
        lists,
        activeList,
        isLoading,
        error,
        createList,
        removeList,
        setActiveList,
        addSymbolToList,
        removeSymbolFromList,
        updateListName,
    };
};

export const useActiveListStocks = () => {
    const { activeList } = useStockLists();

    return useQuery<StockQuote[]>({
        queryKey: ['listStocks', activeList?.id ?? 'none', activeList?.symbols ?? []],
        queryFn: async () => {
            const results = await Promise.allSettled((activeList?.symbols ?? []).map((symbol) => fetchStock(symbol)));
            return results
                .filter((result): result is PromiseFulfilledResult<StockQuote> => result.status === 'fulfilled')
                .map((result) => result.value);
        },
        enabled: !!activeList && activeList.symbols.length > 0,
        staleTime: 20000,
        refetchInterval: 20000,
        placeholderData: (previousData, previousQuery) => {
            if (previousQuery && previousQuery.queryKey[1] === activeList?.id) {
                return previousData;
            }
            return undefined;
        },
    });
};
