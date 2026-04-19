import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2, Pencil, Plus, Share2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { createShareLink } from '../../services/api';
import { useActiveListStocks, useStockLists } from '../../hooks/useStockData';
import { useWebSocket } from '../../hooks/useWebSocket';
import type { StockQuote } from '../../types/stock';
import { logger } from '../../utils/logger';
import { getUserId } from '../../utils/userSession';
import ConfirmDialog from '../shared/ConfirmDialog';
import ListNameModal from '../shared/ListNameModal';
import ShareListModal from '../shared/ShareListModal';

const Watchlist: React.FC = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const {
        lists,
        activeList,
        isLoading: listsLoading,
        error: listsError,
        createList,
        removeList,
        updateListName,
    } = useStockLists();
    const { isLoading, error } = useActiveListStocks();

    const [listToDelete, setListToDelete] = useState<string | null>(null);
    const [createListOpen, setCreateListOpen] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [editingList, setEditingList] = useState<{ id: string; name: string } | null>(null);
    const [editListName, setEditListName] = useState('');
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [sharingList, setSharingList] = useState<{ name: string } | null>(null);

    const { subscribe, unsubscribe } = useWebSocket({
        onPriceUpdate: (symbol, data) => {
            if (!activeList) {
                return;
            }

            queryClient.setQueriesData<StockQuote[]>(
                { queryKey: ['listStocks', activeList.id] },
                (current = []) => current.map((stock) => (stock.symbol === symbol ? data : stock))
            );
        },
    });

    useEffect(() => {
        if (!activeList) {
            return;
        }

        activeList.symbols.forEach((symbol) => subscribe(symbol));

        return () => {
            activeList.symbols.forEach((symbol) => unsubscribe(symbol));
        };
    }, [activeList, subscribe, unsubscribe]);

    const existingNames = lists.map((list) => list.name);

    const handleCreateList = async () => {
        const created = await createList(newListName);

        if (created) {
            setCreateListOpen(false);
            setNewListName('');
        }
    };

    const handleConfirmRemoveList = async () => {
        if (!listToDelete) {
            return;
        }

        const target = lists.find((list) => list.id === listToDelete);
        const removed = await removeList(listToDelete);

        if (removed && target) {
            toast.success(`${target.name} removed`);
        }

        setListToDelete(null);

        if (lists.length === 1) {
            setCreateListOpen(true);
        }
    };

    const handleShareList = async (list: { id: string; name: string; symbols: string[] }) => {
        if (!list.symbols.length) {
            toast.error('Add instruments to share this list');
            return;
        }

        try {
            const data = await createShareLink(list.id, list.name, list.symbols, getUserId());

            if (!data.success) {
                toast.error('Failed to create share link');
                return;
            }

            setShareUrl(data.shareUrl);
            setSharingList({ name: list.name });
            setShowShareModal(true);
        } catch (shareError) {
            logger.error('Share error', shareError);
            toast.error('Failed to create share link');
        }
    };

    const handleRenameList = async () => {
        if (!editingList || !editListName.trim()) {
            return;
        }

        const updated = await updateListName(editingList.id, editListName);

        if (updated) {
            setEditingList(null);
            setEditListName('');
        }
    };

    if (listsLoading || (activeList && isLoading && activeList.symbols.length > 0)) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="mb-4 h-12 w-12 animate-spin text-blue-500" />
                <p className="text-gray-400">Loading your lists...</p>
            </div>
        );
    }

    if (listsError || error) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
                <p className="text-red-400">Failed to load your lists</p>
            </div>
        );
    }

    if (lists.length === 0) {
        return (
            <div>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-100">Custom Stock Lists</h2>
                        <p className="mt-1 text-sm text-gray-400">
                            Create a list to unlock sorting, views, and live list tracking.
                        </p>
                    </div>
                </div>

                <div className="rounded-[28px] border border-dashed border-gray-700 bg-gray-900/50 p-10 text-center">
                    <p className="text-xs uppercase tracking-[0.24em] text-blue-300/70">No Lists</p>
                    <h3 className="mt-3 text-2xl font-semibold text-gray-100">
                        Create your first list to get started
                    </h3>
                    <p className="mt-3 text-sm text-gray-400">
                        Once a list exists, the tracked data section will appear here.
                    </p>
                    <button
                        type="button"
                        onClick={() => setCreateListOpen(true)}
                        className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-blue-500 px-5 py-3 text-white shadow-lg shadow-blue-500/20 transition-colors hover:bg-blue-400"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Create First List</span>
                    </button>
                </div>

                <ConfirmDialog
                    isOpen={listToDelete !== null}
                    title="Delete List?"
                    message="Delete this custom list? Its saved symbols and shared links will be removed."
                    confirmLabel="Delete"
                    onConfirm={handleConfirmRemoveList}
                    onCancel={() => setListToDelete(null)}
                />
                <ListNameModal
                    isOpen={createListOpen}
                    mode="create"
                    value={newListName}
                    onChange={setNewListName}
                    onSubmit={handleCreateList}
                    onCancel={() => setCreateListOpen(false)}
                    existingNames={existingNames}
                />
            </div>
        );
    }

    return (
        <div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-100">Custom Stock Lists</h2>
                    <p className="mt-1 text-sm text-gray-400">Click any list to view and manage stocks</p>
                </div>
            </div>

            <div className="mb-6 rounded-[30px] border border-gray-700/70 bg-linear-to-br from-gray-900/95 via-gray-900/80 to-gray-950/95 p-5 shadow-2xl">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-6">
                    <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-blue-300/70">List Studio</p>
                        <h3 className="mt-2 text-2xl font-semibold text-gray-100">Your collections</h3>
                        <p className="mt-2 max-w-2xl text-sm text-gray-400">
                            Click on any list to view details, add stocks, and manage your portfolio.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setCreateListOpen(true)}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-blue-500 px-5 py-3 text-white shadow-lg shadow-blue-500/20 transition-colors hover:bg-blue-400"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Create New List</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {lists.map((list) => {
                        const isActive = list.id === activeList?.id;

                        return (
                            <div
                                key={list.id}
                                className="rounded-2xl border border-gray-700 bg-gray-900/45 p-4 transition-all hover:border-blue-400/50 hover:bg-blue-500/10 hover:shadow-lg hover:shadow-blue-500/10"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/list/${list.id}`)}
                                        className="min-w-0 flex-1 cursor-pointer text-left"
                                    >
                                        <div className={`text-base font-semibold ${isActive ? 'text-blue-100' : 'text-gray-100'}`}>
                                            {list.name}
                                        </div>
                                        <div className="mt-2 text-sm text-gray-400">
                                            {list.symbols.length} instruments
                                        </div>
                                        <div className="mt-3 text-xs uppercase tracking-[0.2em] text-gray-500">
                                            Click to view details
                                        </div>
                                    </button>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleShareList(list)}
                                            className="cursor-pointer p-1 text-gray-500 transition-colors hover:text-green-400"
                                            title="Share this list"
                                        >
                                            <Share2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingList({ id: list.id, name: list.name });
                                                setEditListName(list.name);
                                            }}
                                            className="cursor-pointer p-1 text-gray-500 transition-colors hover:text-blue-400"
                                            title="Edit list name"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setListToDelete(list.id)}
                                            className="cursor-pointer p-1 text-gray-500 transition-colors hover:text-red-400"
                                            title="Delete list"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <ConfirmDialog
                isOpen={listToDelete !== null}
                title="Delete List?"
                message="Delete this custom list? Its saved symbols and shared links will be removed."
                confirmLabel="Delete"
                onConfirm={handleConfirmRemoveList}
                onCancel={() => setListToDelete(null)}
            />

            <ListNameModal
                isOpen={createListOpen}
                mode="create"
                value={newListName}
                onChange={setNewListName}
                onSubmit={handleCreateList}
                onCancel={() => setCreateListOpen(false)}
                existingNames={existingNames}
            />

            <ListNameModal
                isOpen={editingList !== null}
                mode="edit"
                value={editListName}
                onChange={setEditListName}
                onSubmit={handleRenameList}
                onCancel={() => {
                    setEditingList(null);
                    setEditListName('');
                }}
                currentName={editingList?.name || ''}
                existingNames={lists.filter((list) => list.id !== editingList?.id).map((list) => list.name)}
            />

            <ShareListModal
                isOpen={showShareModal}
                shareUrl={shareUrl}
                listName={sharingList?.name || ''}
                onClose={() => setShowShareModal(false)}
            />
        </div>
    );
};

export default Watchlist;
