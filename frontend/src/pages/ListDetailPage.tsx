import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Loader2, AlertCircle, Share2, Copy, Pencil,
    TrendingUp, Grid2X2, List, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchStock } from '../services/api';
import type { StockQuote, SearchResult } from '../types/stock';
import { useStockLists } from '../hooks/useStockData';
import SearchBar from '../components/SearchBar/SearchBar';
import ValidatedTextInput from '../components/ValidatedTextInput/ValidatedTextInput';
import { validateListName, formatForEdit } from '../utils/textUtils';
import StockCard from '../components/StockCard/StockCard';
import {
    WhatsappShareButton, TelegramShareButton, TwitterShareButton,
    LinkedinShareButton, FacebookShareButton, WhatsappIcon,
    TelegramIcon, TwitterIcon, LinkedinIcon, FacebookIcon,
} from 'react-share';
import { getApiBaseUrl } from '../config';

interface ListData {
    id: string;
    name: string;
    symbols: string[];
    type?: 'shared' | 'local';
}

type SortKey = 'price' | 'change';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'gainers' | 'losers';

const INITIAL_VISIBLE_COUNT = 6;

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
                    <button onClick={onCancel} className="cursor-pointer px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200">Cancel</button>
                    <button onClick={onConfirm} className="cursor-pointer px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white">{confirmLabel}</button>
                </div>
            </div>
        </div>
    );
};

const EditListModal: React.FC<{
    isOpen: boolean;
    currentName: string;
    value: string;
    onChange: (value: string) => void;
    onSave: () => void;
    onCancel: () => void;
    existingNames: string[];
}> = ({ isOpen, currentName, value, onChange, onSave, onCancel, existingNames }) => {
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
                        onValidSubmit={onSave}
                        placeholder="Example: Swing Trades, SIP Radar, Bank Picks"
                        label="List Name"
                        description={`Change "${currentName}" to something new`}
                        maxLength={25}
                        validate={(val) => validateListName(formatForEdit(val), existingNames)}
                        autoFocus
                    />
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onCancel} className="cursor-pointer px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200">Cancel</button>
                    <button onClick={onSave} className="cursor-pointer px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

const ListDetailPage: React.FC = () => {
    const { listId } = useParams<{ listId: string }>();
    const navigate = useNavigate();
    const { updateListName, lists } = useStockLists();

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

    const existingNames = useMemo(() => lists.filter(l => l.id !== list?.id).map(l => l.name), [lists, list?.id]);

    useEffect(() => {
        const loadList = async () => {
            setLoading(true);
            try {
                const savedLists = localStorage.getItem('stock-lists-state');
                if (savedLists) {
                    const parsed = JSON.parse(savedLists);
                    const foundList = parsed.lists?.find((l: any) => l.id === listId);
                    if (foundList) {
                        setList({ id: foundList.id, name: foundList.name, symbols: foundList.symbols, type: 'local' });
                        setEditNameValue(foundList.name);
                        const stockPromises = foundList.symbols.map((symbol: string) => fetchStock(symbol).catch(() => null));
                        const results = await Promise.all(stockPromises);
                        setStocks(results.filter((s): s is StockQuote => s !== null));
                        setLoading(false);
                        return;
                    }
                }

                const response = await fetch(`${getApiBaseUrl()}/list/${listId}`);
                const data = await response.json();

                if (data.success) {
                    setList({ id: data.list.id, name: data.list.name, symbols: data.list.symbols, type: data.type });
                    setEditNameValue(data.list.name);
                    const stockPromises = data.list.symbols.map((symbol: string) => fetchStock(symbol).catch(() => null));
                    const results = await Promise.all(stockPromises);
                    setStocks(results.filter((s): s is StockQuote => s !== null));
                } else {
                    setError('List not found');
                }
            } catch (err) {
                console.error('Error loading list:', err);
                setError('Failed to load list');
            } finally {
                setLoading(false);
            }
        };

        if (listId) loadList();
    }, [listId]);

    const filteredStocks = useMemo(() => {
        if (filter === 'gainers') return stocks.filter(s => s.percent_change > 0);
        if (filter === 'losers') return stocks.filter(s => s.percent_change <= 0);
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

    const addStockToList = async (symbol: string) => {
        if (!list) return;
        const savedLists = localStorage.getItem('stock-lists-state');
        if (savedLists) {
            const parsed = JSON.parse(savedLists);
            const updatedLists = parsed.lists.map((l: any) => l.id === list.id ? { ...l, symbols: [...l.symbols, symbol] } : l);
            localStorage.setItem('stock-lists-state', JSON.stringify({ ...parsed, lists: updatedLists }));
        }
        setList({ ...list, symbols: [...list.symbols, symbol] });
        try {
            const stockData = await fetchStock(symbol);
            setStocks(prev => [...prev, stockData]);
            toast.success(`${symbol} added to ${list.name}`);
        } catch { toast.error(`Failed to add ${symbol}`); }
    };

    const handleConfirmRemoveStock = () => {
        if (!stockToRemove || !list) return;
        const savedLists = localStorage.getItem('stock-lists-state');
        if (savedLists) {
            const parsed = JSON.parse(savedLists);
            const updatedLists = parsed.lists.map((l: any) => l.id === list.id ? { ...l, symbols: l.symbols.filter((s: string) => s !== stockToRemove) } : l);
            localStorage.setItem('stock-lists-state', JSON.stringify({ ...parsed, lists: updatedLists }));
        }
        setList({ ...list, symbols: list.symbols.filter(s => s !== stockToRemove) });
        setStocks(prev => prev.filter(s => s.symbol !== stockToRemove));
        toast.success(`${stockToRemove} removed from ${list.name}`);
        setStockToRemove(null);
    };

    const handleUpdateListName = () => {
        if (!list) return;
        const formatted = formatForEdit(editNameValue);
        const validation = validateListName(formatted, existingNames);
        if (!validation.isValid) { toast.error(validation.error); return; }
        updateListName(list.id, formatted);
        setList({ ...list, name: formatted });
        toast.success(`List renamed to "${formatted}"`);
        setShowEditModal(false);
        setEditNameValue(formatted);
    };

    const createShareLink = async () => {
        if (!list) return;
        setIsSharing(true);
        try {
            const response = await fetch(`${getApiBaseUrl()}/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    listName: list.name,
                    symbols: list.symbols,
                    userId: localStorage.getItem('userId') || 'anonymous',
                    expiresInDays: 7,
                    listId: list.id,
                }),
            });
            const data = await response.json();
            if (data.success) { setShareUrl(data.shareUrl); setShowShareModal(true); }
            else { toast.error('Enter record to share list'); }
        } catch { toast.error('Enter record to share list'); }
        finally { setIsSharing(false); }
    };

    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied!');
    };

    if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><Loader2 className="w-12 h-12 text-blue-500 animate-spin" /></div>;
    if (error || !list) return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">List Not Found</h2>
                <p className="text-gray-400">{error || 'List not found'}</p>
                <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 bg-blue-500 rounded-lg text-white">Go Home</button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col bg-gray-900">
            <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-lg border-b border-gray-800">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate('/')} className="cursor-pointer p-2 rounded-lg hover:bg-gray-800"><ArrowLeft className="w-5 h-5 text-gray-400" /></button>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-linear-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center"><TrendingUp className="w-6 h-6 text-white" /></div>
                                <div>
                                    <div className="flex gap-2">
                                        <h1 className="text-xl font-bold text-white">{list.name}</h1>
                                        <button onClick={() => { setEditNameValue(list.name); setShowEditModal(true); }} className="cursor-pointer p-1 rounded-lg hover:bg-gray-800 transition-colors mt-1" title="Edit list name"><Pencil className="w-4 h-4 text-gray-400" /></button>
                                    </div>
                                    <p className="text-xs text-gray-400">{stocks.length} stocks • {list.type === 'shared' ? 'Shared with you' : 'Your watchlist'}</p>
                                </div>
                            </div>
                        </div>
                        <button onClick={createShareLink} disabled={isSharing || stocks.length === 0} className="cursor-pointer disabled:cursor-not-allowed flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white transition-colors disabled:opacity-50"><Share2 className="w-4 h-4" />{isSharing ? 'Creating...' : 'Share List'}</button>
                    </div>
                </div>
            </header>

            <div className="container mx-auto flex-1 px-4 py-6">
                <SearchBar activeListName={list.name} onSelectResult={(result: SearchResult) => addStockToList(result.symbol)} />

                <div className="flex items-center justify-between gap-4 flex-wrap m-6">
                    <div><h2 className="text-xl font-semibold text-gray-100">Stocks in {list.name}</h2><p className="text-sm text-gray-400 mt-1">{sortedStocks.length} instruments</p></div>
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="inline-flex rounded-xl border border-gray-700 bg-gray-900/70 overflow-hidden">
                            {(['all', 'gainers', 'losers'] as FilterType[]).map((type) => (
                                <button key={type} onClick={() => setFilter(type)} className={`cursor-pointer px-4 py-2 text-sm ${filter === type ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>
                                    {type === 'all' ? 'All' : type === 'gainers' ? '📈 Gainers' : '📉 Losers'}
                                </button>
                            ))}
                        </div>
                        <div className="inline-flex rounded-xl border border-gray-700 bg-gray-900/70 overflow-hidden">
                            <button onClick={() => { if (sortKey === 'change') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); else { setSortKey('change'); setSortOrder('desc'); } }} className={`cursor-pointer px-4 py-2 text-sm inline-flex items-center gap-2 border-r border-gray-700 ${sortKey === 'change' ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-gray-800'}`}><span>%Chg</span><span className={`text-xs ${sortOrder === 'desc' && sortKey === 'change' ? 'rotate-180' : ''}`}>^</span></button>
                            <button onClick={() => { if (sortKey === 'price') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); else { setSortKey('price'); setSortOrder('desc'); } }} className={`cursor-pointer px-4 py-2 text-sm inline-flex items-center gap-2 ${sortKey === 'price' ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-gray-800'}`}><span>Chg</span><span className={`text-xs ${sortOrder === 'desc' && sortKey === 'price' ? 'rotate-180' : ''}`}>^</span></button>
                        </div>
                        <div className="inline-flex rounded-xl bg-gray-800 p-1">
                            <button onClick={() => setViewMode('grid')} className={`cursor-pointer px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-300'}`}><Grid2X2 className="w-4 h-4" />Grid</button>
                            <button onClick={() => setViewMode('list')} className={`cursor-pointer px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-300'}`}><List className="w-4 h-4" />List</button>
                        </div>
                    </div>
                </div>

                {visibleStocks.length === 0 ? (
                    <div className="text-center py-12 h-8/12"><p className="text-gray-400">No stocks yet</p><p className="text-sm text-gray-500 mt-1">Use search above to add</p></div>
                ) : (
                    <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5' : 'space-y-4'}>
                        {visibleStocks.map((stock) => (<StockCard key={stock.symbol} stock={stock} viewMode={viewMode} onRemove={(symbol) => setStockToRemove(symbol)} />))}
                    </div>
                )}

                {hasMore && (<div className="flex justify-center mt-6"><button onClick={() => setVisibleCount(v => v + 6)} className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200">Load More<ChevronDown className="w-4 h-4" /></button></div>)}
            </div>

            <footer className="border-t border-gray-800 mt-16 py-8 px-4"><div className="container mx-auto text-center text-gray-500 text-sm"><p>Data from Yahoo Finance</p><p className="mt-1">© 2026 StockTracker</p></div></footer>

            {showShareModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
                    <div className="w-full max-w-md bg-gray-900 rounded-2xl border border-gray-700 p-6 shadow-2xl">
                        <h3 className="text-xl font-semibold text-white mb-4">Share "{list.name}"</h3>
                        <div className="flex gap-2 mb-4"><input value={shareUrl} readOnly className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" /><button onClick={copyToClipboard} className="cursor-pointer p-2 bg-gray-700 hover:bg-gray-600 rounded-lg"><Copy className="w-5 h-5" /></button></div>
                        <div className="flex justify-between mb-6">
                            <WhatsappShareButton url={shareUrl} title={`Check out my stock watchlist: ${list?.name}`}><div className="flex flex-col items-center gap-1 p-3 bg-green-600 hover:bg-green-500 rounded-xl"><WhatsappIcon size={24} round /><span className="text-xs">WhatsApp</span></div></WhatsappShareButton>
                            <TelegramShareButton url={shareUrl} title={`Check out my stock watchlist: ${list?.name}`}><div className="flex flex-col items-center gap-1 p-3 bg-blue-500 hover:bg-blue-400 rounded-xl"><TelegramIcon size={24} round /><span className="text-xs">Telegram</span></div></TelegramShareButton>
                            <TwitterShareButton url={shareUrl} title={`Check out my stock watchlist: ${list?.name}`}><div className="flex flex-col items-center gap-1 p-3 bg-sky-600 hover:bg-sky-500 rounded-xl"><TwitterIcon size={24} round /><span className="text-xs">Twitter</span></div></TwitterShareButton>
                            <FacebookShareButton url={shareUrl} title={`Check out my stock watchlist: ${list?.name}`}><div className="flex flex-col items-center gap-1 p-3 bg-blue-700 hover:bg-blue-600 rounded-xl"><FacebookIcon size={24} round /><span className="text-xs">Facebook</span></div></FacebookShareButton>
                            <LinkedinShareButton url={shareUrl} title={`Check out my stock watchlist: ${list?.name}`}><div className="flex flex-col items-center gap-1 p-3 bg-blue-800 hover:bg-blue-700 rounded-xl"><LinkedinIcon size={24} round /><span className="text-xs">LinkedIn</span></div></LinkedinShareButton>
                        </div>
                        <button onClick={() => setShowShareModal(false)} className="cursor-pointer w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white">Close</button>
                    </div>
                </div>
            )}

            <EditListModal isOpen={showEditModal} currentName={list.name} value={editNameValue} onChange={setEditNameValue} onSave={handleUpdateListName} onCancel={() => { setShowEditModal(false); setEditNameValue(list.name); }} existingNames={existingNames} />
            <ConfirmModal isOpen={stockToRemove !== null} title="Remove Stock" message={`Remove ${stockToRemove} from "${list.name}"?`} confirmLabel="Remove" onConfirm={handleConfirmRemoveStock} onCancel={() => setStockToRemove(null)} />
        </div>
    );
};

export default ListDetailPage;