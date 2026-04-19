import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Activity, TrendingUp, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import SearchBar from './components/SearchBar/SearchBar';
import AppFooter from './components/shared/AppFooter';
import { useStockLists } from './hooks/useStockData';
import { usePageMeta } from './hooks/usePageMeta';
import { fetchStock } from './services/api';
import type { SearchResult, StockQuote } from './types/stock';

const MarketStats = lazy(() => import('./components/MarketStats/MarketStats'));
const Watchlist = lazy(() => import('./components/Watchlist/Watchlist'));
const ListDetailPage = lazy(() => import('./pages/ListDetailPage'));
const SharedListView = lazy(() => import('./pages/SharedListView'));

const RouteFallback = () => (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
    </div>
);

const SectionSkeleton: React.FC<{ title: string; heightClassName: string }> = ({ title, heightClassName }) => (
    <div className="mb-8 overflow-hidden rounded-[30px] border border-slate-800/80 bg-slate-900/50 p-6 shadow-2xl">
        <div className="mb-5">
            <div className="h-4 w-28 rounded-full bg-slate-800" />
            <div className="mt-3 h-8 w-56 rounded-full bg-slate-800" />
            <div className="mt-3 h-4 w-80 max-w-full rounded-full bg-slate-800" />
            <span className="sr-only">{title} loading</span>
        </div>
        <div className={`w-full rounded-[24px] bg-slate-800/80 ${heightClassName}`} />
    </div>
);

const DeferredSection: React.FC<{
    children: React.ReactNode;
    fallback: React.ReactNode;
}> = ({ children, fallback }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (shouldRender) {
            return;
        }

        const container = containerRef.current;
        if (!container) {
            return;
        }

        const win = window as Window & {
            requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
            cancelIdleCallback?: (handle: number) => void;
        };

        const usedIdleCallback = typeof win.requestIdleCallback === 'function';
        const idleHandle = usedIdleCallback
            ? win.requestIdleCallback!(() => setShouldRender(true), { timeout: 1200 })
            : window.setTimeout(() => setShouldRender(true), 600);

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    setShouldRender(true);
                }
            },
            { rootMargin: '300px 0px' }
        );

        observer.observe(container);

        return () => {
            observer.disconnect();

            if (typeof idleHandle === 'number') {
                if (usedIdleCallback && typeof win.cancelIdleCallback === 'function') {
                    win.cancelIdleCallback(idleHandle);
                } else {
                    window.clearTimeout(idleHandle);
                }
            }
        };
    }, [shouldRender]);

    return <div ref={containerRef}>{shouldRender ? children : fallback}</div>;
};

const AppContent: React.FC = () => {
    const queryClient = useQueryClient();
    const [scrolled, setScrolled] = useState(false);
    const { activeList, addSymbolToList } = useStockLists();
    usePageMeta({
        title: 'StockTracker',
        description: 'Track custom stock lists, mutual funds, SIPs, and indices with responsive live market updates.',
    });

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

        const success = await addSymbolToList(result.symbol, activeList.id);

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

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900">
            <a
                href="#main-content"
                className="sr-only z-[60] rounded-xl bg-cyan-400 px-4 py-2 font-medium text-slate-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
            >
                Skip to content
            </a>

            <header
                className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-gray-900/95 shadow-lg backdrop-blur-lg' : 'bg-transparent'}`}
            >
                <div className="container mx-auto px-4 py-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-r from-blue-500 to-cyan-500">
                                <TrendingUp className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-100">
                                    Stock<span className="text-blue-400">Tracker</span>
                                </h1>
                                <p className="text-xs text-gray-400">Custom Lists, Funds, SIPs, and Indices</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-400 md:justify-end">
                            <Zap className="h-4 w-4 text-yellow-500" />
                            <span>Auto-updating lists and live market snapshot</span>
                        </div>
                    </div>
                </div>
            </header>

            <section className="px-4 pb-12 pt-28">
                <div className="container mx-auto text-center">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-2">
                        <Activity className="h-4 w-4 text-blue-400" />
                        <span className="text-sm text-blue-400">Live Market Data</span>
                    </div>
                    <h1 className="mb-4 text-4xl font-bold text-gray-100 md:text-6xl">
                        Track Stocks, Funds,
                        <span className="bg-linear-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                            {' '}SIPs, and Indices
                        </span>
                    </h1>
                    <p className="mx-auto mb-8 max-w-3xl text-lg text-gray-400">
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

            <main id="main-content" className="container mx-auto px-4 py-8">
                <DeferredSection fallback={<SectionSkeleton title="Market Snapshot" heightClassName="h-72" />}>
                    <Suspense fallback={<SectionSkeleton title="Market Snapshot" heightClassName="h-72" />}>
                        <MarketStats />
                    </Suspense>
                </DeferredSection>

                <DeferredSection fallback={<SectionSkeleton title="Custom Stock Lists" heightClassName="h-[28rem]" />}>
                    <Suspense fallback={<SectionSkeleton title="Custom Stock Lists" heightClassName="h-[28rem]" />}>
                        <Watchlist />
                    </Suspense>
                </DeferredSection>
            </main>

            <AppFooter message="Data is pulled from Yahoo Finance endpoints for live quotes, indices, and search results." />
        </div>
    );
};

const App: React.FC = () => {
    return (
        <BrowserRouter>
            <Suspense fallback={<RouteFallback />}>
                <Routes>
                    <Route path="/" element={<AppContent />} />
                    <Route path="/list/:listId" element={<ListDetailPage />} />
                    <Route path="/share/:shareId" element={<SharedListView />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
};

export default App;
