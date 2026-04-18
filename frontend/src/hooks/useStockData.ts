import { formatForCreation, formatForEdit, validateListName } from '../utils/textUtils';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchHistoricalData, fetchStock, searchStocks } from '../services/api';
import type { HistoricalDataPoint, SearchResult, StockList, StockQuote } from '../types/stock';
import toast from 'react-hot-toast';

const STOCK_LISTS_STORAGE_KEY = 'stock-lists-state';
const STOCK_LISTS_UPDATED_EVENT = 'stock-lists-updated';

interface StockListsState {
    lists: StockList[];
    activeListId: string;
}

const DEFAULT_LIST: StockList = {
    id: 'default',
    name: 'My Watchlist',
    symbols: [],
};

const createDefaultState = (): StockListsState => ({
    lists: [DEFAULT_LIST],
    activeListId: DEFAULT_LIST.id,
});

const normalizeState = (state: Partial<StockListsState> | null | undefined): StockListsState => {
    const lists = Array.isArray(state?.lists)
        ? state.lists.map((list) => ({
            id: String(list.id),
            name: String(list.name),
            symbols: Array.isArray(list.symbols) ? list.symbols.map((symbol) => String(symbol).toUpperCase()) : [],
        }))
        : createDefaultState().lists;

    const activeListId = lists.some((list) => list.id === state?.activeListId)
        ? String(state?.activeListId)
        : lists[0]?.id ?? '';

    return { lists, activeListId };
};

const readStockListsState = (): StockListsState => {
    if (typeof window === 'undefined') {
        return createDefaultState();
    }

    const saved = window.localStorage.getItem(STOCK_LISTS_STORAGE_KEY);

    if (!saved) {
        return createDefaultState();
    }

    try {
        return normalizeState(JSON.parse(saved));
    } catch {
        return createDefaultState();
    }
};

const writeStockListsState = (state: StockListsState) => {
    window.localStorage.setItem(STOCK_LISTS_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(STOCK_LISTS_UPDATED_EVENT, { detail: state }));
};

const createListId = () => `list-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
    const [state, setState] = useState<StockListsState>(() => readStockListsState());

    useEffect(() => {
        const syncState = () => {
            setState(readStockListsState());
        };

        const handleCustomUpdate = (event: Event) => {
            const customEvent = event as CustomEvent<StockListsState>;
            setState(normalizeState(customEvent.detail));
        };

        window.addEventListener('storage', syncState);
        window.addEventListener(STOCK_LISTS_UPDATED_EVENT, handleCustomUpdate as EventListener);

        return () => {
            window.removeEventListener('storage', syncState);
            window.removeEventListener(STOCK_LISTS_UPDATED_EVENT, handleCustomUpdate as EventListener);
        };
    }, []);

    const saveState = (nextState: StockListsState) => {
        const normalized = normalizeState(nextState);
        writeStockListsState(normalized);
        setState(normalized);
    };

    const createList = (name: string) => {
        const formatted = formatForCreation(name);

        if (!formatted) {
            toast.error('Please enter a valid list name');
            return null;
        }

        const existingNames = state.lists.map(l => l.name);
        const validation = validateListName(formatted, existingNames);

        if (!validation.isValid) {
            toast.error(validation.error);
            return null;
        }

        const newList: StockList = {
            id: createListId(),
            name: formatted,
            symbols: [],
        };

        saveState({
            lists: [...state.lists, newList],
            activeListId: newList.id,
        });

        toast.success(`${formatted} created`);
        return newList;
    };

    const removeList = (listId: string) => {
        const remainingLists = state.lists.filter((list) => list.id !== listId);
        const nextLists = remainingLists;
        const nextActiveListId = state.activeListId === listId ? (nextLists[0]?.id ?? '') : state.activeListId;

        saveState({
            lists: nextLists,
            activeListId: nextActiveListId,
        });

        queryClient.removeQueries({ queryKey: ['listStocks', listId] });
        return true;
    };

    const setActiveList = (listId: string) => {
        if (!state.lists.some((list) => list.id === listId)) {
            return;
        }

        saveState({
            lists: state.lists,
            activeListId: listId,
        });
    };

    const addSymbolToList = (symbol: string, listId: string = state.activeListId) => {
        const normalized = symbol.trim().toUpperCase();

        if (!normalized) {
            return false;
        }

        const targetList = state.lists.find((list) => list.id === listId);

        if (!targetList || targetList.symbols.includes(normalized)) {
            return false;
        }

        const nextLists = state.lists.map((list) =>
            list.id === listId ? { ...list, symbols: [...list.symbols, normalized] } : list
        );

        saveState({
            lists: nextLists,
            activeListId: state.activeListId,
        });

        const nextList = nextLists.find((list) => list.id === listId)!;
        const currentStocks = queryClient.getQueryData<StockQuote[]>(['listStocks', targetList.id, targetList.symbols]) ?? [];
        queryClient.setQueryData<StockQuote[]>(['listStocks', nextList.id, nextList.symbols], currentStocks);
        return true;
    };

    const removeSymbolFromList = (symbol: string, listId: string = state.activeListId) => {
        const normalized = symbol.trim().toUpperCase();
        const targetList = state.lists.find((list) => list.id === listId);

        if (!targetList) {
            return;
        }

        const nextSymbols = targetList.symbols.filter((item) => item !== normalized);
        const currentStocks = queryClient.getQueryData<StockQuote[]>(['listStocks', targetList.id, targetList.symbols]) ?? [];
        const nextStocks = currentStocks.filter((stock) => stock.symbol !== normalized);

        const nextLists = state.lists.map((list) =>
            list.id === listId ? { ...list, symbols: nextSymbols } : list
        );

        saveState({
            lists: nextLists,
            activeListId: state.activeListId,
        });

        queryClient.setQueriesData<StockQuote[]>({ queryKey: ['listStocks', listId] }, (current = []) =>
            current.filter((stock) => stock.symbol !== normalized)
        );
        queryClient.setQueryData<StockQuote[]>(['listStocks', listId, nextSymbols], nextStocks);
    };

    const updateListName = (listId: string, newName: string) => {
        const formatted = formatForEdit(newName);

        if (!formatted) {
            toast.error('List name cannot be empty');
            return false;
        }

        const existingNames = state.lists
            .filter(list => list.id !== listId)
            .map(list => list.name);

        const validation = validateListName(formatted, existingNames);
        if (!validation.isValid) {
            toast.error(validation.error);
            return false;
        }

        const targetList = state.lists.find((list) => list.id === listId);
        if (targetList?.name === formatted) {
            toast.error('New name is the same as current name');
            return false;
        }

        const nextLists = state.lists.map((list) =>
            list.id === listId ? { ...list, name: formatted } : list
        );

        saveState({
            lists: nextLists,
            activeListId: state.activeListId,
        });

        queryClient.invalidateQueries({ queryKey: ['listStocks', listId] });
        toast.success(`List renamed to "${formatted}"`);
        return true;
    };

    const activeList = state.lists.find((list) => list.id === state.activeListId) ?? state.lists[0] ?? null;

    return {
        lists: state.lists,
        activeList,
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