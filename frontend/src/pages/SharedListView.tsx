import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, AlertCircle, Calendar, TrendingUp } from 'lucide-react';
import StockCard from '../components/StockCard/StockCard';
import AppFooter from '../components/shared/AppFooter';
import { usePageMeta } from '../hooks/usePageMeta';
import { fetchSharedList, fetchStock } from '../services/api';
import type { StockQuote } from '../types/stock';
import { logger } from '../utils/logger';

type SharedListData = {
    shareId: string;
    listName: string;
    symbols: string[];
    description: string;
    createdAt: string;
    views: number;
};

const SharedListView: React.FC = () => {
    const { shareId } = useParams<{ shareId: string }>();
    const [list, setList] = useState<SharedListData | null>(null);
    const [stocks, setStocks] = useState<StockQuote[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    usePageMeta({
        title: list ? `${list.listName} Shared List` : 'Shared Watchlist',
        description: list
            ? `Open the shared watchlist ${list.listName} and review its tracked instruments.`
            : 'Open a shared watchlist and review its tracked instruments.',
    });

    useEffect(() => {
        const loadSharedList = async () => {
            try {
                const data = await fetchSharedList(shareId!);

                setList(data.list);

                const stockPromises = data.list.symbols.map((symbol: string) =>
                    fetchStock(symbol).catch(() => null)
                );
                const stockResults = await Promise.all(stockPromises);
                setStocks(stockResults.filter((stock): stock is StockQuote => stock !== null));
            } catch (err) {
                logger.error('Error loading shared list', err);
                setError('Failed to load shared list');
            } finally {
                setLoading(false);
            }
        };

        if (shareId) {
            loadSharedList();
        }
    }, [shareId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-white mb-2">List Not Found</h2>
                    <p className="text-gray-400">{error}</p>
                    <Link to="/" className="mt-4 inline-block px-4 py-2 bg-blue-500 rounded-lg text-white">
                        Go Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-white">{list?.listName}</h1>
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-400">
                            <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>Created {new Date(list?.createdAt || '').toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <TrendingUp className="w-4 h-4" />
                                <span>{list?.symbols.length} stocks</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-6 text-center">
                    <p className="text-blue-400 text-sm">
                        Someone shared this watchlist with you. Prices update in real time.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {stocks.map((stock) => (
                        <StockCard
                            key={stock.symbol}
                            stock={stock}
                            viewMode="grid"
                            onRemove={() => {}}
                        />
                    ))}
                </div>

                {stocks.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-400">No stocks in this list</p>
                    </div>
                )}
            </div>
            <AppFooter message="Shared market data is displayed from Yahoo Finance quote endpoints." />
        </div>
    );
};

export default SharedListView;
