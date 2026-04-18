import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Activity, TrendingUp, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import MarketStats from './components/MarketStats/MarketStats';
import SearchBar from './components/SearchBar/SearchBar';
import Watchlist from './components/Watchlist/Watchlist';
import { useStockLists } from './hooks/useStockData';
import { fetchStock } from './services/api';
import type { SearchResult, StockQuote } from './types/stock';
import ListDetailPage from './pages/ListDetailPage';
import SharedListView from './pages/SharedListView';

const AppContent: React.FC = () => {
    const queryClient = useQueryClient();
    const [scrolled, setScrolled] = useState(false);
    const { activeList, addSymbolToList } = useStockLists();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleAddResult = async (result: SearchResult) => {
        if (!activeList) {
            toast.error('Create a list first');
            return;
        }

        const success = addSymbolToList(result.symbol, activeList.id);

        if (!success) {
            toast.error(`${result.symbol} is already in ${activeList.name}`);
            return;
        }

        toast.success(`${result.symbol} added to ${activeList.name}`);

        try {
            const quote = await fetchStock(result.symbol);
            queryClient.setQueryData<StockQuote[]>(
                ['listStocks', activeList.id, [...activeList.symbols, result.symbol.toUpperCase()]],
                (current = []) => {
                    const withoutExisting = current.filter((item) => item.symbol !== quote.symbol);
                    return [...withoutExisting, quote];
                }
            );
        } catch {
            queryClient.invalidateQueries({ queryKey: ['listStocks', activeList.id] });
        }
    };

    const scrollToSearch = () => {
        document.getElementById('search-section')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900">
            <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-gray-900/95 backdrop-blur-lg shadow-lg' : 'bg-transparent'}`}>
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-linear-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-100">Stock<span className="text-blue-400">Tracker</span></h1>
                                <p className="text-xs text-gray-400">Custom Lists, Funds, SIPs, and Indices</p>
                            </div>
                        </div>
                        <div className="hidden md:flex items-center gap-2 text-sm text-gray-400">
                            <Zap className="w-4 h-4 text-yellow-500" />
                            <span>Auto-updating lists and live market snapshot</span>
                        </div>
                    </div>
                </div>
            </header>

            <section className="pt-28 pb-12 px-4">
                <div className="container mx-auto text-center">
                    <div className="inline-flex items-center gap-2 bg-blue-500/10 rounded-full px-4 py-2 mb-6">
                        <Activity className="w-4 h-4 text-blue-400" />
                        <span className="text-sm text-blue-400">Live Market Data</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold text-gray-100 mb-4">
                        Track Stocks, Funds,
                        <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-cyan-400">
                            {' '}SIPs, and Indices
                        </span>
                    </h1>
                    <p className="text-gray-400 text-lg max-w-3xl mx-auto mb-8">
                        Create multiple custom lists, sort by price or change, switch between grid and list views, and keep everything updated automatically.
                    </p>
                </div>
            </section>

            <section id="search-section" className="px-4 pb-8">
                <div className="container mx-auto">
                    <SearchBar
                        activeListName={activeList?.name ?? 'Create a list first'}
                        onSelectResult={handleAddResult}
                        disabled={!activeList}
                    />
                </div>
            </section>

            <main className="container mx-auto px-4 py-8">
                <MarketStats />
                <Watchlist onAddMore={scrollToSearch} />
            </main>

            <footer className="border-t border-gray-800 mt-16 py-8 px-4">
                <div className="container mx-auto text-center text-gray-500 text-sm">
                    <p>Data is pulled from Yahoo Finance endpoints for live quotes, indices, and search results.</p>
                    <p className="mt-1">© 2026 StockTracker</p>
                </div>
            </footer>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<AppContent />} />
                <Route path="/list/:listId" element={<ListDetailPage />} />
                <Route path="/share/:shareId" element={<SharedListView />} />
            </Routes>
        </BrowserRouter>
    );
};

export default App;