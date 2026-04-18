import React, { useState, useEffect } from 'react';
import { useStock } from '../../hooks/useStockData';
import ChartModal from './ChartModal';
import InlineChart from './InlineChart';
import { Loader2 } from 'lucide-react';

interface StockChartProps {
    symbol?: string;
    companyName?: string;
    isExpanded?: boolean;
    onClose?: () => void;
}

const StockChartWrapper: React.FC<StockChartProps> = ({ symbol, isExpanded = false }) => {
    const [showModal, setShowModal] = useState(() => {
        if (typeof window !== 'undefined' && symbol) {
            const saved = localStorage.getItem(`chart-modal-${symbol}`);
            if (saved === 'true') {
                return true;
            }
        }
        return isExpanded;
    });
    const { data: stock } = useStock(symbol || null);

    useEffect(() => {
        if (symbol && typeof window !== 'undefined') {
            localStorage.setItem(`chart-modal-${symbol}`, String(showModal));
        }
    }, [showModal, symbol]);

    if (!symbol) {
        return <div className="text-gray-400 text-center py-8">No symbol selected</div>;
    }

    if (!stock) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-4 h-96">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                <p className="text-gray-400 text-lg">Loading stock data...</p>
            </div>
        );
    }

    return (
        <>
            <div className="w-full mb-6">
                <InlineChart 
                    symbol={symbol} 
                    height={400}
                    onChartClick={() => setShowModal(true)}
                />
            </div>

            <ChartModal
                stock={stock}
                isOpen={showModal}
                onClose={() => setShowModal(false)}
            />
        </>
    );
};

export default StockChartWrapper;