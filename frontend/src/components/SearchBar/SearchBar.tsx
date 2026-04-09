import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Landmark, Loader2, PiggyBank, Plus, Search, TrendingUp } from 'lucide-react';
import { useStockSearch } from '../../hooks/useStockData';
import type { SearchResult } from '../../types/stock';

interface SearchBarProps {
    activeListName: string;
    onSelectResult: (result: SearchResult) => void;
}

const categoryMeta: Record<SearchResult['category'], { label: string; className: string; icon: React.ReactNode }> = {
    stock: {
        label: 'Stock',
        className: 'bg-blue-500/15 text-blue-300',
        icon: <TrendingUp className="w-4 h-4" />,
    },
    mutual_fund: {
        label: 'Fund',
        className: 'bg-emerald-500/15 text-emerald-300',
        icon: <Building2 className="w-4 h-4" />,
    },
    sip: {
        label: 'SIP / MF',
        className: 'bg-amber-500/15 text-amber-300',
        icon: <PiggyBank className="w-4 h-4" />,
    },
    index: {
        label: 'Index',
        className: 'bg-fuchsia-500/15 text-fuchsia-300',
        icon: <Landmark className="w-4 h-4" />,
    },
};

const SearchBar: React.FC<SearchBarProps> = ({ activeListName, onSelectResult }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [debouncedTerm, setDebouncedTerm] = useState('');
    const [selectedFilter, setSelectedFilter] = useState<'all' | 'funds_sip' | 'stock' | 'index'>('all');
    const wrapperRef = useRef<HTMLDivElement>(null);

    const { data: results, isLoading, error } = useStockSearch(debouncedTerm);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedTerm(searchTerm);
        }, 250);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredResults = useMemo(() => {
        const items = results ?? [];

        if (selectedFilter === 'all') {
            return items;
        }

        if (selectedFilter === 'funds_sip') {
            return items.filter((item) => item.category === 'mutual_fund' || item.category === 'sip');
        }

        return items.filter((item) => item.category === selectedFilter);
    }, [results, selectedFilter]);

    const totalResults = filteredResults.length;

    const handleSelect = (result: SearchResult) => {
        onSelectResult(result);
        setSearchTerm('');
        setDebouncedTerm('');
        setIsOpen(false);
    };

    const filterOptions: Array<{ id: 'all' | 'funds_sip' | 'stock' | 'index'; label: string }> = [
        { id: 'all', label: 'All' },
        { id: 'stock', label: 'Stocks' },
        { id: 'funds_sip', label: 'Mutual Funds / SIP' },
        { id: 'index', label: 'Indices' },
    ];

    return (
        <div ref={wrapperRef} className="relative w-full max-w-4xl mx-auto">
            <div className="mb-3 text-sm text-gray-400 text-center">
                Adding search results into <span className="text-blue-300 font-medium">{activeListName}</span>
            </div>

            <div className="rounded-[28px] border border-gray-700/80 bg-gray-900/70 backdrop-blur-md shadow-2xl overflow-hidden transition-all duration-200 focus-within:border-blue-400/80 focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.22)]">
                <div className="px-4 pt-4 pb-3 border-b border-gray-700/60 bg-gray-950/40">
                    <div className="flex gap-2 flex-wrap">
                        {filterOptions.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => {
                                    setSelectedFilter(option.id);
                                    if (searchTerm.trim().length >= 2) {
                                        setIsOpen(true);
                                    }
                                }}
                                className={`cursor-pointer px-3 py-1.5 rounded-full text-xs transition-colors ${selectedFilter === option.id ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(event) => {
                            setSearchTerm(event.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        placeholder={`Search ${selectedFilter === 'all' ? 'stocks, mutual funds, SIPs, and indices' : filterOptions.find((option) => option.id === selectedFilter)?.label.toLowerCase()}`}
                        className="w-full pl-12 pr-4 py-4 bg-transparent focus:outline-none text-gray-100 placeholder-gray-500 text-lg transition-all duration-200"
                    />
                    {isLoading && (
                        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 w-5 h-5 animate-spin" />
                    )}
                </div>
            </div>

            {isOpen && searchTerm.trim().length >= 2 && (
                <div className="absolute z-50 w-full mt-2 bg-gray-800/95 backdrop-blur-md border border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
                    {error && (
                        <div className="p-6 text-center text-red-400">
                            <p>Search failed. Please try again.</p>
                        </div>
                    )}

                    {!error && !isLoading && totalResults === 0 && (
                        <div className="p-6 text-center text-gray-400">
                            <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No results found for "{searchTerm}"</p>
                            <p className="text-sm mt-1">Try TCS, HDFC Balanced Fund, SIP, or NIFTY</p>
                        </div>
                    )}

                    {!error && totalResults > 0 && (
                        <div className="max-h-112 overflow-y-auto">
                            <div className="px-4 py-3 border-b border-gray-700/50 bg-gray-900/60 sticky top-0 z-10 text-xs text-gray-400">
                                Showing {totalResults} {selectedFilter === 'all' ? 'results' : filterOptions.find((option) => option.id === selectedFilter)?.label.toLowerCase()}
                            </div>

                            {filteredResults.map((result, index) => {
                                const meta = categoryMeta[result.category];

                                return (
                                    <button
                                        key={`${result.symbol}-${result.category}-${index}`}
                                        onClick={() => handleSelect(result)}
                                        className="cursor-pointer w-full text-left px-4 py-3 hover:bg-gray-700/40 transition-colors border-b border-gray-700/40 last:border-0 group"
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <span className="font-bold text-gray-100 text-lg group-hover:text-blue-400 transition-colors">
                                                        {result.symbol}
                                                    </span>
                                                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${meta.className}`}>
                                                        {meta.icon}
                                                        <span>{meta.label}</span>
                                                    </span>
                                                    {result.exchange && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
                                                            {result.exchange}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-400 truncate">
                                                    {result.company_name}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0 text-blue-300">
                                                <span className="hidden sm:inline text-xs">Add to {activeListName}</span>
                                                <Plus className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchBar;
