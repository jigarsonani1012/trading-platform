import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    AlertCircle,
    ArrowLeft,
    ChevronDown,
    Grid2X2,
    List,
    Loader2,
    Pencil,
    Share2,
    TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import SearchBar from '../components/SearchBar/SearchBar';
import StockCard from '../components/StockCard/StockCard';
import AppFooter from '../components/shared/AppFooter';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import ListNameModal from '../components/shared/ListNameModal';
import ShareListModal from '../components/shared/ShareListModal';
import { usePageMeta } from '../hooks/usePageMeta';
import { useStockLists } from '../hooks/useStockData';
import { createShareLink, fetchListById, fetchStock } from '../services/api';
import type { SearchResult, StockList, StockQuote } from '../types/stock';
import { formatForEdit, validateListName } from '../utils/textUtils';
import { getUserId } from '../utils/userSession';
import { logger } from '../utils/logger';

type ListData = StockList & {
    type?: 'shared' | 'local';
};

type SortKey = 'price' | 'change';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'gainers' | 'losers';

const INITIAL_VISIBLE_COUNT = 6;

const ListDetailPage: React.FC = () => {
    const { listId } = useParams<{ listId: string }>();
    const navigate = useNavigate();
    const { updateListName, addSymbolToList, removeSymbolFromList, lists } = useStockLists();

    const [list, setList] = useState<ListData | null>(null);
    const [stocks, setStocks] = useState<StockQuote[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [isSharing, setIsSharing] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editNameValue, setEditNameValue] = useState('');
    const [stockToRemove, setStockToRemove] = useState<string | null>(null);
    const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
    const [filter, setFilter] = useState<FilterType>('all');
    const [sortKey, setSortKey] = useState<SortKey>('change');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    usePageMeta({
        title: list ? `${list.name} Watchlist` : 'Watchlist',
        description: list
            ? `Review ${list.name}, sort tracked instruments, and manage the list on any device.`
            : 'Review and manage tracked instruments.',
    });

    const existingNames = useMemo(
        () => lists.filter((item) => item.id !== list?.id).map((item) => item.name),
        [lists, list?.id]
    );

    useEffect(() => {
        const loadList = async () => {
            if (!listId) {
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const localList = lists.find((item) => item.id === listId);
                const nextList = localList
                    ? { ...localList, type: 'local' as const }
                    : await fetchListById(listId, getUserId()).then((response) => ({
                        ...response.list,
                        type: response.type,
                    }));

                setList(nextList);
                setEditNameValue(nextList.name);

                const results = await Promise.all(
                    nextList.symbols.map((symbol) => fetchStock(symbol).catch(() => null))
                );
                setStocks(results.filter((stock): stock is StockQuote => stock !== null));
            } catch (loadError) {
                logger.error('Error loading list', loadError);
                setError('Failed to load list');
            } finally {
                setLoading(false);
            }
        };

        void loadList();
    }, [listId, lists]);

    const filteredStocks = useMemo(() => {
        if (filter === 'gainers') {
            return stocks.filter((stock) => stock.percent_change > 0);
        }

        if (filter === 'losers') {
            return stocks.filter((stock) => stock.percent_change <= 0);
        }

        return stocks;
    }, [filter, stocks]);

    const sortedStocks = useMemo(() => {
        const items = [...filteredStocks];
        const multiplier = sortOrder === 'asc' ? 1 : -1;

        items.sort((a, b) => {
            const aValue = sortKey === 'price' ? a.change : a.percent_change;
            const bValue = sortKey === 'price' ? b.change : b.percent_change;
            return (aValue - bValue) * multiplier;
        });

        return items;
    }, [filteredStocks, sortKey, sortOrder]);

    const visibleStocks = sortedStocks.slice(0, visibleCount);
    const hasMore = sortedStocks.length > visibleCount;

    const addStock = async (symbol: string) => {
        if (!list) {
            return;
        }

        if (list.type !== 'local') {
            toast.error('Shared lists are read-only');
            return;
        }

        const normalized = symbol.trim().toUpperCase();

        if (!await addSymbolToList(normalized, list.id)) {
            toast.error(`${normalized} is already in ${list.name}`);
            return;
        }

        setList((current) => current ? { ...current, symbols: [...current.symbols, normalized] } : current);

        try {
            const stockData = await fetchStock(normalized);
            setStocks((current) => [...current.filter((item) => item.symbol !== stockData.symbol), stockData]);
            toast.success(`${normalized} added to ${list.name}`);
        } catch {
            toast.error(`Failed to add ${normalized}`);
        }
    };

    const handleConfirmRemoveStock = async () => {
        if (!stockToRemove || !list) {
            return;
        }

        if (list.type !== 'local') {
            toast.error('Shared lists are read-only');
            return;
        }

        const removed = await removeSymbolFromList(stockToRemove, list.id);

        if (!removed) {
            return;
        }

        setList((current) =>
            current ? { ...current, symbols: current.symbols.filter((symbol) => symbol !== stockToRemove) } : current
        );
        setStocks((current) => current.filter((stock) => stock.symbol !== stockToRemove));
        toast.success(`${stockToRemove} removed from ${list.name}`);
        setStockToRemove(null);
    };

    const handleUpdateListName = async () => {
        if (!list) {
            return;
        }

        if (list.type !== 'local') {
            toast.error('Shared lists cannot be renamed');
            return;
        }

        const formatted = formatForEdit(editNameValue);
        const validation = validateListName(formatted, existingNames);

        if (!validation.isValid) {
            toast.error(validation.error);
            return;
        }

        if (await updateListName(list.id, formatted)) {
            setList((current) => current ? { ...current, name: formatted } : current);
            setShowEditModal(false);
            setEditNameValue(formatted);
        }
    };

    const handleCreateShareLink = async () => {
        if (!list) {
            return;
        }

        setIsSharing(true);

        try {
            const data = await createShareLink(list.id, list.name, list.symbols, getUserId());

            if (!data.success) {
                toast.error('Failed to create share link');
                return;
            }

            setShareUrl(data.shareUrl);
            setShowShareModal(true);
        } catch {
            toast.error('Failed to create share link');
        } finally {
            setIsSharing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-900">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
            </div>
        );
    }

    if (error || !list) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-900">
                <div className="text-center">
                    <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
                    <h2 className="mb-2 text-xl font-semibold text-white">List Not Found</h2>
                    <p className="text-gray-400">{error || 'List not found'}</p>
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-white"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-gray-900">
            <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-900/95 backdrop-blur-lg">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 items-center gap-4">
                            <button
                                type="button"
                                onClick={() => navigate('/')}
                                aria-label="Back to home"
                                className="cursor-pointer rounded-lg p-2 hover:bg-gray-800"
                            >
                                <ArrowLeft className="h-5 w-5 text-gray-400" />
                            </button>

                            <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-r from-blue-500 to-cyan-500">
                                    <TrendingUp className="h-6 w-6 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-start gap-2">
                                        <h1 className="truncate text-xl font-bold text-white">{list.name}</h1>
                                        {list.type === 'local' && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditNameValue(list.name);
                                                    setShowEditModal(true);
                                                }}
                                                className="mt-1 cursor-pointer rounded-lg p-1 transition-colors hover:bg-gray-800"
                                                title="Edit list name"
                                            >
                                                <Pencil className="h-4 w-4 text-gray-400" />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400">
                                        {stocks.length} stocks | {list.type === 'shared' ? 'Shared with you' : 'Your watchlist'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleCreateShareLink}
                            disabled={isSharing || stocks.length === 0}
                            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                        >
                            <Share2 className="h-4 w-4" />
                            {isSharing ? 'Creating...' : 'Share List'}
                        </button>
                    </div>
                </div>
            </header>

            <div className="container mx-auto flex-1 px-4 py-6">
                <SearchBar
                    activeListName={list.name}
                    onSelectResult={(result: SearchResult) => addStock(result.symbol)}
                    disabled={list.type !== 'local'}
                />

                <div className="m-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-100">Stocks in {list.name}</h2>
                        <p className="mt-1 text-sm text-gray-400">{sortedStocks.length} instruments</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="inline-flex overflow-hidden rounded-xl border border-gray-700 bg-gray-900/70">
                            {(['all', 'gainers', 'losers'] as FilterType[]).map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setFilter(type)}
                                    className={`cursor-pointer px-4 py-2 text-sm ${filter === type ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
                                >
                                    {type === 'all' ? 'All' : type === 'gainers' ? 'Gainers' : 'Losers'}
                                </button>
                            ))}
                        </div>

                        <div className="inline-flex overflow-hidden rounded-xl border border-gray-700 bg-gray-900/70">
                            <button
                                type="button"
                                onClick={() => {
                                    if (sortKey === 'change') {
                                        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                                        return;
                                    }

                                    setSortKey('change');
                                    setSortOrder('desc');
                                }}
                                className={`inline-flex cursor-pointer items-center gap-2 border-r border-gray-700 px-4 py-2 text-sm ${sortKey === 'change' ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
                            >
                                <span>%Chg</span>
                                <span className={`text-xs ${sortOrder === 'desc' && sortKey === 'change' ? 'rotate-180' : ''}`}>^</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (sortKey === 'price') {
                                        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                                        return;
                                    }

                                    setSortKey('price');
                                    setSortOrder('desc');
                                }}
                                className={`inline-flex cursor-pointer items-center gap-2 px-4 py-2 text-sm ${sortKey === 'price' ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
                            >
                                <span>Chg</span>
                                <span className={`text-xs ${sortOrder === 'desc' && sortKey === 'price' ? 'rotate-180' : ''}`}>^</span>
                            </button>
                        </div>

                        <div className="inline-flex rounded-xl bg-gray-800 p-1">
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-300'}`}
                            >
                                <Grid2X2 className="h-4 w-4" />
                                Grid
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-300'}`}
                            >
                                <List className="h-4 w-4" />
                                List
                            </button>
                        </div>
                    </div>
                </div>

                {visibleStocks.length === 0 ? (
                    <div className="h-8/12 py-12 text-center">
                        <p className="text-gray-400">No stocks yet</p>
                        <p className="mt-1 text-sm text-gray-500">Use search above to add</p>
                    </div>
                ) : (
                    <div className={viewMode === 'grid' ? 'grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}>
                        {visibleStocks.map((stock) => (
                            <StockCard
                                key={stock.symbol}
                                stock={stock}
                                viewMode={viewMode}
                                onRemove={list.type === 'local' ? (symbol) => setStockToRemove(symbol) : () => {}}
                            />
                        ))}
                    </div>
                )}

                {hasMore && (
                    <div className="mt-6 flex justify-center">
                        <button
                            type="button"
                            onClick={() => setVisibleCount((value) => value + 6)}
                            className="inline-flex items-center gap-2 rounded-xl bg-gray-800 px-5 py-2 text-gray-200 hover:bg-gray-700"
                        >
                            Load More
                            <ChevronDown className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>

            <AppFooter message="Data from Yahoo Finance" />

            <ShareListModal
                isOpen={showShareModal}
                shareUrl={shareUrl}
                listName={list.name}
                onClose={() => setShowShareModal(false)}
            />

            <ListNameModal
                isOpen={showEditModal}
                mode="edit"
                value={editNameValue}
                onChange={setEditNameValue}
                onSubmit={handleUpdateListName}
                onCancel={() => {
                    setShowEditModal(false);
                    setEditNameValue(list.name);
                }}
                currentName={list.name}
                existingNames={existingNames}
            />

            <ConfirmDialog
                isOpen={list.type === 'local' && stockToRemove !== null}
                title="Remove Stock"
                message={`Remove ${stockToRemove} from "${list.name}"?`}
                confirmLabel="Remove"
                onConfirm={handleConfirmRemoveStock}
                onCancel={() => setStockToRemove(null)}
            />
        </div>
    );
};

export default ListDetailPage;
