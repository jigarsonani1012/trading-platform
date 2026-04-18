import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
    AlertCircle,
    ChevronDown,
    Loader2,
    Plus,
    Trash2,
    Pencil,
    Share2,
    Check,
    X,
    Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useActiveListStocks, useStockLists } from '../../hooks/useStockData';
import { useWebSocket } from '../../hooks/useWebSocket';
import type { StockQuote } from '../../types/stock';
import ValidatedTextInput from '../ValidatedTextInput/ValidatedTextInput';
import { validateListName, formatForCreation } from '../../utils/textUtils';
import { WhatsappShareButton, TelegramShareButton, TwitterShareButton, LinkedinShareButton, FacebookShareButton, WhatsappIcon, TelegramIcon, TwitterIcon, LinkedinIcon, FacebookIcon } from 'react-share';
import { getApiBaseUrl } from '../../config';

interface WatchlistProps {
    onAddMore?: () => void;
}

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
                        className="cursor-pointer px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white transition-colors"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

// interface ListData {
//     id: string;
//     name: string;
//     symbols: string[];
//     type?: 'shared' | 'local';
// }

const ShareModal: React.FC<{
    isOpen: boolean;
    shareUrl: string;
    listName: string;
    onClose: () => void;
}> = ({ isOpen, shareUrl, listName, onClose }) => {
    const [isCopied, setIsCopied] = useState(false);

    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(shareUrl);
        setIsCopied(true);
        toast.success('Link copied!');
        setTimeout(() => setIsCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
            <div className="w-full max-w-lg bg-gray-900 rounded-2xl border border-gray-700 p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-white">Share "{listName}"</h3>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-800">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="flex gap-2 mb-4">
                    <input
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                    />
                    <button
                        onClick={copyToClipboard}
                        className="cursor-pointer p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                        {isCopied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-gray-300" />}
                    </button>
                </div>

                <div className="flex justify-between gap-3 mb-6">
                    <WhatsappShareButton url={shareUrl} title={`Check out my stock watchlist: ${listName}`}>
                        <div className="flex flex-col items-center gap-1 p-3 bg-green-600 hover:bg-green-500 rounded-xl transition-colors">
                            <WhatsappIcon size={24} round />
                            <span className="text-xs">WhatsApp</span>
                        </div>
                    </WhatsappShareButton>

                    <TelegramShareButton url={shareUrl} title={`Check out my stock watchlist: ${listName}`}>
                        <div className="flex flex-col items-center gap-1 p-3 bg-blue-500 hover:bg-blue-400 rounded-xl transition-colors">
                            <TelegramIcon size={24} round />
                            <span className="text-xs">Telegram</span>
                        </div>
                    </TelegramShareButton>

                    <TwitterShareButton url={shareUrl} title={`Check out my stock watchlist: ${listName}`}>
                        <div className="flex flex-col items-center gap-1 p-3 bg-sky-600 hover:bg-sky-500 rounded-xl transition-colors">
                            <TwitterIcon size={24} round />
                            <span className="text-xs">Twitter</span>
                        </div>
                    </TwitterShareButton>

                    <FacebookShareButton url={shareUrl} title={`Check out my stock watchlist: ${listName}`}>
                        <div className="flex flex-col items-center gap-1 p-3 bg-blue-700 hover:bg-blue-600 rounded-xl transition-colors">
                            <FacebookIcon size={24} round />
                            <span className="text-xs">Facebook</span>
                        </div>
                    </FacebookShareButton>

                    <LinkedinShareButton url={shareUrl} title={`Check out my stock watchlist: ${listName}`}>
                        <div className="flex flex-col items-center gap-1 p-3 bg-blue-800 hover:bg-blue-700 rounded-xl transition-colors">
                            <LinkedinIcon size={24} round />
                            <span className="text-xs">LinkedIn</span>
                        </div>
                    </LinkedinShareButton>
                </div>

                <button
                    onClick={onClose}
                    className="cursor-pointer w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                >
                    Close
                </button>
            </div>
        </div>
    );
};

const Watchlist: React.FC<WatchlistProps> = () => {
    const queryClient = useQueryClient();
    const { lists, activeList, createList, removeList, removeSymbolFromList, updateListName } = useStockLists();
    const { data: stocks, isLoading, error } = useActiveListStocks();

    const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
    const [listToDelete, setListToDelete] = useState<string | null>(null);
    const [stockToRemove, setStockToRemove] = useState<string | null>(null);
    const [createListOpen, setCreateListOpen] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [editingList, setEditingList] = useState<{ id: string; name: string } | null>(null);
    const [editListName, setEditListName] = useState('');
    const navigate = useNavigate();

    const [showShareModal, setShowShareModal] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [sharingList, setSharingList] = useState<{ name: string; url: string } | null>(null);

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
    const hasMore = stockList.length > visibleCount;

    const handleCreateList = () => {
        const created = createList(newListName);
        if (created) {
            toast.success(`${created.name} created`);
            setCreateListOpen(false);
            setNewListName('');
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
        if (lists.length === 1) setCreateListOpen(true);
    };

    const handleShareList = async (list: { id: string; name: string; symbols: string[] }) => {
        if (!list.symbols.length) {
            toast.error('Add instruments to share this list');
            return;
        }

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
            if (data.success) {
                setShareUrl(data.shareUrl);
                setSharingList({ name: list.name, url: data.shareUrl });
                setShowShareModal(true);
            } else {
                toast.error(data.error || 'Failed to create share link');
            }
        } catch (error) {
            console.error('Share error:', error);
            toast.error('Failed to create share link');
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
                    <p className="mt-3 text-sm text-gray-400">Once a list exists, the tracked data section will appear here.</p>
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
                    <p className="text-sm text-gray-400 mt-1">Click any list to view and manage stocks</p>
                </div>
            </div>

            <div className="rounded-[30px] border border-gray-700/70 bg-linear-to-br from-gray-900/95 via-gray-900/80 to-gray-950/95 p-5 mb-6 shadow-2xl">
                <div className="flex items-start justify-between gap-6 flex-wrap mb-5">
                    <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-blue-300/70">List Studio</p>
                        <h3 className="mt-2 text-2xl font-semibold text-gray-100">Your collections</h3>
                        <p className="mt-2 text-sm text-gray-400 max-w-2xl">Click on any list to view details, add stocks, and manage your portfolio.</p>
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
                                className="rounded-2xl border border-gray-700 bg-gray-900/45 p-4 transition-all hover:border-blue-400/50 hover:bg-blue-500/10 hover:shadow-lg hover:shadow-blue-500/10"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <button
                                        onClick={() => navigate(`/list/${list.id}`)}
                                        className="cursor-pointer text-left flex-1 min-w-0"
                                    >
                                        <div className={`text-base font-semibold ${isActive ? 'text-blue-100' : 'text-gray-100'}`}>
                                            {list.name}
                                        </div>
                                        <div className="mt-2 text-sm text-gray-400">{list.symbols.length} instruments</div>
                                        <div className="mt-3 text-xs uppercase tracking-[0.2em] text-gray-500">
                                            Click to view details
                                        </div>
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleShareList(list)}
                                            className="cursor-pointer disabled:cursor-not-drop text-gray-500 hover:text-green-400 transition-colors p-1"
                                            title="Share this list"
                                        >
                                            <Share2 className="w-4 h-4" />
                                        </button>
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

            <ShareModal
                isOpen={showShareModal}
                shareUrl={shareUrl}
                listName={sharingList?.name || ''}
                onClose={() => setShowShareModal(false)}
            />
        </div>
    );
};

export default Watchlist;