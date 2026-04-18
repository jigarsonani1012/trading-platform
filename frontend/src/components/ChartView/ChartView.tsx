import React, { useState } from 'react';
import SearchBar from '../SearchBar/SearchBar';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import type { SearchResult } from '../../types/stock';
import StockChartWrapper from '../StockChart/StockChartWrapper';

interface ChartViewProps {
    initialSymbol?: string;
    onBack?: () => void;
}

const ChartView: React.FC<ChartViewProps> = ({ initialSymbol, onBack }) => {
    const [currentSymbol, setCurrentSymbol] = useState(initialSymbol || '');

    const handleSelectStock = (result: SearchResult) => {
        setCurrentSymbol(result.symbol);
    };

    return (
        <div className="min-h-screen bg-gray-900">
            <div className="container mx-auto px-4 py-6">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="cursor-pointer p-2 rounded-lg hover:bg-gray-800 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-400" />
                        </button>
                    )}
                    <h1 className="text-2xl font-bold text-gray-100">Advanced Chart</h1>
                </div>

                {/* Search */}
                <div className="max-w-md mb-6">
                    <SearchBar 
                        activeListName="Chart View" 
                        onSelectResult={handleSelectStock} 
                    />
                </div>

                {/* Chart */}
                {currentSymbol ? (
                    <StockChartWrapper symbol={currentSymbol} isExpanded />
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 gap-6 h-150">
                        <div className="skeleton-chart h-96 w-full max-w-2xl bg-linear-to-r from-gray-700/50 via-gray-600/50 to-gray-700/50 rounded-2xl animate-pulse"></div>
                        <div className="text-center text-gray-400">
                            <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <h2 className="text-2xl font-bold mb-2">No Chart Selected</h2>
                            <p>Use the search above to find and chart any stock</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChartView;