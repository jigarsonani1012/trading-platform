import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, AlertCircle, Calendar, TrendingUp, ArrowLeft } from 'lucide-react';
import StockCard from '../components/StockCard/StockCard';
import { fetchStock } from '../services/api';
import type { StockQuote } from '../types/stock';

interface SharedListData {
    shareId: string;
    listName: string;
    symbols: string[];
    description: string;
    createdAt: string;
    views: number;
}

const SharedListView: React.FC = () => {
    const { shareId } = useParams<{ shareId: string }>();
    const [list, setList] = useState<SharedListData | null>(null);
    const [stocks, setStocks] = useState<StockQuote[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadSharedList = async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/share/${shareId}`);
                const data = await response.json();

                if (!data.success) {
                    setError(data.error);
                    return;
                }

                setList(data.list);

                const stockPromises = data.list.symbols.map((symbol: string) =>
                    fetchStock(symbol).catch(() => null)
                );
                const stockResults = await Promise.all(stockPromises);
                setStocks(stockResults.filter((s): s is StockQuote => s !== null));
            } catch (err) {
                console.error('Error loading shared list:', err);
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
                <div className="flex items-center gap-4 mb-6">
                    {/* <Link to="/" className="p-2 rounded-lg hover:bg-gray-800 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </Link> */}
                    <div>
                        <h1 className="text-3xl font-bold text-white">{list?.listName}</h1>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
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
                        📋 Someone shared this watchlist with you. Prices update in real-time.
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
        </div>
    );
};

export default SharedListView;