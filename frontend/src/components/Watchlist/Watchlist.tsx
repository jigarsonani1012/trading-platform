import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    AlertCircle,
    ChevronDown,
    Grid2X2,
    List,
    Loader2,
    Plus,
    Trash2,
    Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useActiveListStocks, useStockLists } from '../../hooks/useStockData';
import { useWebSocket } from '../../hooks/useWebSocket';
import type { StockQuote } from '../../types/stock';
import StockCard from '../StockCard/StockCard';
import ValidatedTextInput from '../ValidatedTextInput/ValidatedTextInput';
import { validateListName, formatForCreation } from '../../utils/textUtils';

interface WatchlistProps {
    onAddMore?: () => void;
}

type SortKey = 'price' | 'change';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'gainers' | 'losers';

const INITIAL_VISIBLE_COUNT = 6;

// Confirm Modal Component
const ConfirmModal: React.FC<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ isOpen, title, message, confirmLabel, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
            <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
                <h3 className="text-lg font-semibold text-gray-100">{title}</h3>
                <p className="mt-2 text-sm text-gray-400">{message}</p>
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="cursor-pointer px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="cursor-pointer px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors"
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Create List Modal Component
const CreateListModal: React.FC<{
    isOpen: boolean;
    value: string;
    onChange: (value: string) => void;
    onCreate: () => void;
    onCancel: () => void;
    existingNames: string[];
}> = ({ isOpen, value, onChange, onCreate, onCancel, existingNames }) => {
    const [error, setError] = useState<string | null>(null);

    const handleCreate = () => {
        const formatted = formatForCreation(value);
        const validation = validateListName(formatted, existingNames);
        if (!validation.isValid) {
            setError(validation.error);
            toast.error(validation.error);
            return;
        }
        onCreate();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
            <div className="w-full max-w-lg rounded-[28px] border border-gray-700/80 bg-linear-to-br from-gray-900 to-gray-950 p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-blue-300/70">New List</p>
                        <h3 className="mt-2 text-2xl font-semibold text-gray-100">Create a custom tracker</h3>
                        <p className="mt-2 text-sm text-gray-400">Organize stocks, funds, SIPs, and indices into focused lists.</p>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-blue-500/15 text-blue-300 flex items-center justify-center">
                        <Plus className="w-6 h-6" />
                    </div>
                </div>

                <div className="mt-6">
                    <ValidatedTextInput
                        value={value}
                        onChange={onChange}
                        onValidSubmit={handleCreate}
                        placeholder="Example: Swing Trades, SIP Radar, Bank Picks"
                        label="List Name"
                        description="Letters, numbers, spaces, &, -, ., () only"
                        maxLength={25}
                        validate={(val) => validateListName(formatForCreation(val), existingNames)}
                        autoFocus
                    />
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="cursor-pointer px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={!value || !!error}
                        className="cursor-pointer px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
                    >
                        Create List
                    </button>
                </div>
            </div>
        </div>
    );
};

// Edit List Modal Component
const EditListModal: React.FC<{
    isOpen: boolean;
    currentName: string;
    currentId: string;
    value: string;
    onChange: (value: string) => void;
    onSave: () => void;
    onCancel: () => void;
    existingNames: Array<{ id: string; name: string }>;
}> = ({ isOpen, currentName, currentId, value, onChange, onSave, onCancel, existingNames }) => {
    const handleSave = () => {
        const existingNamesList = existingNames
            .filter(list => list.id !== currentId)
            .map(list => list.name);

        const validation = validateListName(value, existingNamesList);
        if (!validation.isValid) {
            toast.error(validation.error);
            return;
        }
        onSave();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
            <div className="w-full max-w-lg rounded-[28px] border border-gray-700/80 bg-linear-to-br from-gray-900 to-gray-950 p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-blue-300/70">Edit List</p>
                        <h3 className="mt-2 text-2xl font-semibold text-gray-100">Rename your collection</h3>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-blue-500/15 text-blue-300 flex items-center justify-center">
                        <Pencil className="w-6 h-6" />
                    </div>
                </div>

                <div className="mt-6">
                    <ValidatedTextInput
                        value={value}
                        onChange={onChange}
                        onValidSubmit={handleSave}
                        placeholder="Example: Swing Trades, SIP Radar, Bank Picks"
                        label="List Name"
                        description={`Change "${currentName}" to something new`}
                        maxLength={25}
                        validate={(val) => {
                            const existingNamesList = existingNames
                                .filter(list => list.id !== currentId)
                                .map(list => list.name);
                            return validateListName(val, existingNamesList);
                        }}
                        autoFocus
                    />
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="cursor-pointer px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        // disabled={!value || !!error}
                        className="cursor-pointer px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

// Main Watchlist Component
const Watchlist: React.FC<WatchlistProps> = () => {
    const queryClient = useQueryClient();
    const { lists, activeList, createList, removeList, setActiveList, removeSymbolFromList, updateListName } = useStockLists();
    const { data: stocks, isLoading, error } = useActiveListStocks();

    const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
    const [sortKey, setSortKey] = useState<SortKey>('change');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [filter, setFilter] = useState<FilterType>('all');

    const [listToDelete, setListToDelete] = useState<string | null>(null);
    const [stockToRemove, setStockToRemove] = useState<string | null>(null);
    const [createListOpen, setCreateListOpen] = useState(false);
    const [newListName, setNewListName] = useState('');

    // Edit list state
    const [editingList, setEditingList] = useState<{ id: string; name: string } | null>(null);
    const [editListName, setEditListName] = useState('');

    const { subscribe, unsubscribe } = useWebSocket({
        onPriceUpdate: (symbol, data) => {
            if (!activeList) return;

            queryClient.setQueriesData<StockQuote[]>({ queryKey: ['listStocks', activeList.id] }, (current = []) =>
                current.map((stock) => (stock.symbol === symbol ? data : stock))
            );
        },
    });

    useEffect(() => {
        if (!activeList) return;

        activeList.symbols.forEach((symbol) => subscribe(symbol));
        return () => {
            activeList.symbols.forEach((symbol) => unsubscribe(symbol));
        };
    }, [activeList, subscribe, unsubscribe]);

    const stockList = useMemo(() => stocks ?? [], [stocks]);

    const filteredStocks = useMemo(() => {
        if (filter === 'gainers') {
            return stockList.filter((stock) => stock.change > 0);
        }
        if (filter === 'losers') {
            return stockList.filter((stock) => stock.change <= 0);
        }
        return stockList;
    }, [filter, stockList]);

    const sortedStocks = useMemo(() => {
        const items = [...filteredStocks];
        const multiplier = sortOrder === 'asc' ? 1 : -1;

        items.sort((a, b) => {
            let aValue: number, bValue: number;
            if (sortKey === 'price') {
                aValue = a.change;
                bValue = b.change;
            } else {
                aValue = a.percent_change;
                bValue = b.percent_change;
            }
            return (aValue - bValue) * multiplier;
        });
        return items;
    }, [filteredStocks, sortKey, sortOrder]);

    const visibleStocks = sortedStocks.slice(0, visibleCount);
    const hasMore = sortedStocks.length > visibleCount;

    const handleCreateList = () => {
        const created = createList(newListName);
        if (created) {
            toast.success(`${created.name} created`);
            setCreateListOpen(false);
            setNewListName('');
            return;
        }
    };

    const handleConfirmRemoveStock = () => {
        if (!stockToRemove || !activeList) return;
        removeSymbolFromList(stockToRemove, activeList.id);
        toast.success(`${stockToRemove} removed from ${activeList.name}`);
        setStockToRemove(null);
    };

    const handleConfirmRemoveList = () => {
        if (!listToDelete) return;
        const target = lists.find(list => list.id === listToDelete);
        const removed = removeList(listToDelete);
        if (removed && target) toast.success(`${target.name} removed`);
        setListToDelete(null);

        if (lists.length === 1) {
            setCreateListOpen(true);
        }
    };

    if (activeList && isLoading && activeList.symbols.length > 0 && stockList.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-400">Loading {activeList.name}...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <p className="text-red-400">Failed to load your active list</p>
            </div>
        );
    }

    if (lists.length === 0) {
        return (
            <div>
                <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-100">Custom Stock Lists</h2>
                        <p className="text-sm text-gray-400 mt-1">Create a list to unlock sorting, views, and live list tracking.</p>
                    </div>
                </div>

                <div className="rounded-[28px] border border-dashed border-gray-700 bg-gray-900/50 p-10 text-center">
                    <p className="text-xs uppercase tracking-[0.24em] text-blue-300/70">No Lists</p>
                    <h3 className="mt-3 text-2xl font-semibold text-gray-100">Create your first list to get started</h3>
                    <p className="mt-3 text-sm text-gray-400">Once a list exists, the filters, sort controls, views, and tracked data section will appear here.</p>
                    <button
                        onClick={() => setCreateListOpen(true)}
                        className="cursor-pointer mt-6 inline-flex items-center gap-2 rounded-2xl px-5 py-3 bg-blue-500 hover:bg-blue-400 text-white transition-colors shadow-lg shadow-blue-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create First List</span>
                    </button>
                </div>

                <ConfirmModal
                    isOpen={listToDelete !== null}
                    title="Delete List ?"
                    message="Delete this custom list? Its saved symbols will be removed from this tracker."
                    confirmLabel="Delete"
                    onConfirm={handleConfirmRemoveList}
                    onCancel={() => setListToDelete(null)}
                />

                <CreateListModal
                    isOpen={createListOpen}
                    value={newListName}
                    onChange={setNewListName}
                    onCreate={handleCreateList}
                    onCancel={() => setCreateListOpen(false)}
                    existingNames={lists.map(l => l.name)}
                />
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
                <div>
                    <h2 className="text-2xl font-bold text-gray-100">Custom Stock Lists</h2>
                    <p className="text-sm text-gray-400 mt-1">Auto-updating data with sorting, multiple views, and saved lists</p>
                </div>
            </div>

            <div className="rounded-[30px] border border-gray-700/70 bg-linear-to-br from-gray-900/95 via-gray-900/80 to-gray-950/95 p-5 mb-6 shadow-2xl">
                <div className="flex items-start justify-between gap-6 flex-wrap mb-5">
                    <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-blue-300/70">List Studio</p>
                        <h3 className="mt-2 text-2xl font-semibold text-gray-100">Switch between your custom collections</h3>
                        <p className="mt-2 text-sm text-gray-400 max-w-2xl">Keep separate baskets for swing trades, SIP ideas, index tracking, or sector-specific picks.</p>
                    </div>

                    <button
                        onClick={() => setCreateListOpen(true)}
                        className="cursor-pointer inline-flex items-center gap-2 rounded-2xl px-5 py-3 bg-blue-500 hover:bg-blue-400 text-white transition-colors shadow-lg shadow-blue-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create New List</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {lists.map(list => {
                        const isActive = list.id === activeList.id;
                        return (
                            <div
                                key={list.id}
                                className={`rounded-2xl border p-4 transition-all ${isActive ? 'border-blue-400/50 bg-blue-500/10 shadow-lg shadow-blue-500/10' : 'border-gray-700 bg-gray-900/45 hover:border-gray-600'}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <button onClick={() => setActiveList(list.id)} className="cursor-pointer text-left flex-1 min-w-0">
                                        <div className={`text-base font-semibold ${isActive ? 'text-blue-100' : 'text-gray-100'}`}>
                                            {list.name}
                                        </div>
                                        <div className="mt-2 text-sm text-gray-400">{list.symbols.length} instruments</div>
                                        <div className="mt-3 text-xs uppercase tracking-[0.2em] text-gray-500">
                                            {isActive ? 'Active List' : 'Saved List'}
                                        </div>
                                    </button>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                setEditingList({ id: list.id, name: list.name });
                                                setEditListName(list.name);
                                            }}
                                            className="cursor-pointer text-gray-500 hover:text-blue-400 transition-colors p-1"
                                            title="Edit list name"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setListToDelete(list.id)}
                                            className="cursor-pointer text-gray-500 hover:text-red-400 transition-colors p-1"
                                            title="Delete list"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
                <div>
                    <h3 className="text-xl font-semibold text-gray-100">{activeList.name}</h3>
                    <p className="text-sm text-gray-400 mt-1">{stockList.length} instruments in this list</p>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                    <div className="inline-flex rounded-xl border border-gray-700 bg-gray-900/70 overflow-hidden">
                        {(['all', 'gainers', 'losers'] as FilterType[]).map((type) => (
                            <button
                                key={type}
                                onClick={() => {
                                    setFilter(type);
                                    setVisibleCount(INITIAL_VISIBLE_COUNT);
                                }}
                                className={`cursor-pointer px-4 py-2 text-sm ${filter === type ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
                            >
                                {type === 'all' ? 'All' : type === 'gainers' ? 'Gainers' : 'Losers'}
                            </button>
                        ))}
                    </div>

                    <div className="inline-flex rounded-xl border border-gray-700 bg-gray-900/70 overflow-hidden">
                        <button
                            onClick={() => {
                                if (sortKey === 'change') {
                                    setSortOrder((cur) => (cur === 'desc' ? 'asc' : 'desc'));
                                } else {
                                    setSortKey('change');
                                    setSortOrder('desc');
                                }
                                setVisibleCount(INITIAL_VISIBLE_COUNT);
                            }}
                            className={`cursor-pointer px-4 py-2 text-sm inline-flex items-center gap-2 border-r border-gray-700 ${sortKey === 'change' ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-gray-800'
                                }`}
                        >
                            <span>%Chg</span>
                            <span className={`text-xs ${sortOrder === 'desc' && sortKey === 'change' ? 'rotate-180' : ''}`}>^</span>
                        </button>
                        <button
                            onClick={() => {
                                if (sortKey === 'price') {
                                    setSortOrder((cur) => (cur === 'desc' ? 'asc' : 'desc'));
                                } else {
                                    setSortKey('price');
                                    setSortOrder('desc');
                                }
                                setVisibleCount(INITIAL_VISIBLE_COUNT);
                            }}
                            className={`cursor-pointer px-4 py-2 text-sm inline-flex items-center gap-2 ${sortKey === 'price' ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-gray-800'
                                }`}
                        >
                            <span>Chg</span>
                            <span className={`text-xs ${sortOrder === 'desc' && sortKey === 'price' ? 'rotate-180' : ''}`}>^</span>
                        </button>
                    </div>

                    <div className="inline-flex rounded-xl bg-gray-800 p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`cursor-pointer px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-300'
                                }`}
                        >
                            <Grid2X2 className="w-4 h-4" />
                            Grid
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`cursor-pointer px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-300'
                                }`}
                        >
                            <List className="w-4 h-4" />
                            List
                        </button>
                    </div>
                </div>
            </div>

            {visibleStocks.length === 0 ? (
                <p className="text-gray-400 text-center py-10">No instruments found for the selected filter.</p>
            ) : (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5' : 'space-y-4'}>
                    {visibleStocks.map((stock) => (
                        <StockCard
                            key={`${activeList.id}-${stock.symbol}`}
                            stock={stock}
                            viewMode={viewMode}
                            onRemove={(symbol) => setStockToRemove(symbol)}
                        />
                    ))}
                </div>
            )}

            {hasMore && (
                <div className="flex justify-center mt-6">
                    <button
                        onClick={() => setVisibleCount((cur) => cur + 6)}
                        className="cursor-pointer inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors"
                    >
                        <span>Load More</span>
                        <ChevronDown className="w-4 h-4" />
                    </button>
                </div>
            )}

            <ConfirmModal
                isOpen={stockToRemove !== null}
                title="Remove Instrument ?"
                message={`Remove ${stockToRemove} from ${activeList?.name ?? 'this list'}?`}
                confirmLabel="Remove"
                onConfirm={handleConfirmRemoveStock}
                onCancel={() => setStockToRemove(null)}
            />

            <ConfirmModal
                isOpen={listToDelete !== null}
                title="Delete List ?"
                message="Delete this custom list? Its saved symbols will be removed from this tracker."
                confirmLabel="Delete"
                onConfirm={handleConfirmRemoveList}
                onCancel={() => setListToDelete(null)}
            />

            <CreateListModal
                isOpen={createListOpen}
                value={newListName}
                onChange={setNewListName}
                onCreate={handleCreateList}
                onCancel={() => setCreateListOpen(false)}
                existingNames={lists.map(l => l.name)}
            />

            <EditListModal
                isOpen={editingList !== null}
                currentName={editingList?.name || ''}
                currentId={editingList?.id || ''}
                value={editListName}
                onChange={setEditListName}
                onSave={() => {
                    if (editingList && editListName.trim()) {
                        updateListName(editingList.id, editListName);
                        setEditingList(null);
                        setEditListName('');
                    }
                }}
                onCancel={() => {
                    setEditingList(null);
                    setEditListName('');
                }}
                existingNames={lists}
            />
        </div>
    );
};

export default Watchlist;