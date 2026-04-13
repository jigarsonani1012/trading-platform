import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';
import type { IChartApi, Time } from 'lightweight-charts';
import { X, Loader2, AlertCircle, Settings } from 'lucide-react';
import { useHistoricalData } from '../../hooks/useStockData';
import type { StockQuote } from '../../types/stock';
import { createPortal } from 'react-dom';

interface ChartModalProps {
    stock: StockQuote;
    isOpen: boolean;
    onClose: () => void;
}

type TimePeriod = '1d' | '1w' | '1mo' | '3mo' | '6mo' | '1y';

// Settings Panel Component - Outside to avoid re-renders
const SettingsPanel: React.FC<{
    colors: { upColor: string; downColor: string };
    onColorsChange: (colors: { upColor: string; downColor: string }) => void;
    onClose: () => void;
}> = ({ colors, onColorsChange, onClose }) => (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 w-96 max-h-[80vh] overflow-y-auto shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-6">Chart Settings</h3>

            {/* Color Settings */}
            <div className="space-y-4 mb-6">
                <div>
                    <label className="text-sm text-gray-400 block mb-2">Up Color (Bullish)</label>
                    <div className="flex items-center gap-3">
                        <input
                            type="color"
                            value={colors.upColor}
                            onChange={(e) => onColorsChange({ ...colors, upColor: e.target.value })}
                            className="w-12 h-10 rounded cursor-pointer border border-gray-600"
                        />
                        <span className="text-sm text-gray-300">{colors.upColor}</span>
                    </div>
                </div>

                <div>
                    <label className="text-sm text-gray-400 block mb-2">Down Color (Bearish)</label>
                    <div className="flex items-center gap-3">
                        <input
                            type="color"
                            value={colors.downColor}
                            onChange={(e) => onColorsChange({ ...colors, downColor: e.target.value })}
                            className="w-12 h-10 rounded cursor-pointer border border-gray-600"
                        />
                        <span className="text-sm text-gray-300">{colors.downColor}</span>
                    </div>
                </div>
            </div>

            {/* Scale Options */}
            <div className="space-y-3 mb-6 pb-6 border-b border-gray-700">
                <p className="text-sm text-gray-400 font-semibold">Scale</p>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                    <input type="radio" name="scale" defaultChecked className="w-4 h-4" />
                    <span>Auto (fit data to screen)</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                    <input type="radio" name="scale" className="w-4 h-4" />
                    <span>Lock price to bar ratio</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                    <input type="radio" name="scale" className="w-4 h-4" />
                    <span>Scale price chart only</span>
                </label>
            </div>

            {/* Price Format Options */}
            <div className="space-y-3 mb-6">
                <p className="text-sm text-gray-400 font-semibold">Price Format</p>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                    <input type="radio" name="format" defaultChecked className="w-4 h-4" />
                    <span>Regular</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                    <input type="radio" name="format" className="w-4 h-4" />
                    <span>Percent</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                    <input type="radio" name="format" className="w-4 h-4" />
                    <span>Indexed to 100</span>
                </label>
            </div>

            <button
                onClick={onClose}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors"
            >
                Done
            </button>
        </div>
    </div>
);

const ChartModal: React.FC<ChartModalProps> = ({ stock, isOpen, onClose }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const [period, setPeriod] = useState<TimePeriod>('1mo');
    const [showSettings, setShowSettings] = useState(false);
    
    // Chart color settings - restore from localStorage
    const [colors, setColors] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(`chart-colors-${stock.symbol}`);
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch {
                    return { upColor: '#10B981', downColor: '#EF4444' };
                }
            }
        }
        return { upColor: '#10B981', downColor: '#EF4444' };
    });
    
    // Map '1w' to '5d' because backend only supports '1d', '5d', '1mo', etc.
    const periodForFetch = period === '1w' ? '5d' : period;
    const { data: historicalData, isLoading, error } = useHistoricalData(stock.symbol, periodForFetch, '1d');

    // Persist color settings to localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(`chart-colors-${stock.symbol}`, JSON.stringify(colors));
        }
    }, [colors, stock.symbol]);

    useEffect(() => {
        if (!isOpen || !chartContainerRef.current) return;
        
        if (!historicalData?.length) return;

        const initializeChart = () => {
            if (chartRef.current) {
                chartRef.current.remove();
            }

            const container = chartContainerRef.current;
            if (!container) return;
            
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            if (width <= 0 || height <= 0) return;

            try {
                const chart = createChart(container, {
                    layout: {
                        background: { type: ColorType.Solid, color: '#111827' },
                        textColor: '#9CA3AF',
                        fontSize: 13,
                    },
                    width,
                    height,
                    timeScale: {
                        timeVisible: true,
                        secondsVisible: false,
                        fixLeftEdge: false,
                        fixRightEdge: false,
                    },
                    rightPriceScale: {
                        textColor: '#9CA3AF',
                    },
                    crosshair: {
                        mode: 1,
                        vertLine: { color: '#374151', width: 1, style: 1 },
                        horzLine: { color: '#374151', width: 1, style: 1 },
                    },
                    grid: {
                        horzLines: { color: '#1F2937' },
                        vertLines: { color: '#1F2937' },
                    },
                });

                const candlestickSeries = chart.addSeries(CandlestickSeries, {
                    upColor: colors.upColor,
                    downColor: colors.downColor,
                    borderUpColor: colors.upColor,
                    borderDownColor: colors.downColor,
                    wickUpColor: colors.upColor,
                    wickDownColor: colors.downColor,
                });

                const chartData = historicalData.map((point) => {
                    const timeValue = typeof point.time === 'number' 
                        ? Math.floor(point.time)
                        : Math.floor(new Date(String(point.time)).getTime() / 1000);
                    
                    return {
                        time: timeValue as unknown as Time,
                        open: point.open,
                        high: point.high,
                        low: point.low,
                        close: point.close,
                    };
                });
                
                if (chartData.length > 0) {
                    candlestickSeries.setData(chartData);
                    chart.timeScale().fitContent();
                }

                chartRef.current = chart;
            } catch (err) {
                console.error('Error initializing chart:', err);
            }
        };

        const handleResize = () => {
            if (chartRef.current && chartContainerRef.current) {
                const newWidth = chartContainerRef.current.clientWidth;
                const newHeight = chartContainerRef.current.clientHeight;
                if (newWidth > 0 && newHeight > 0) {
                    chartRef.current.applyOptions({ width: newWidth, height: newHeight });
                }
            }
        };

        setTimeout(() => initializeChart(), 100);
        
        const resizeObserver = new ResizeObserver(() => handleResize());
        if (chartContainerRef.current) {
            resizeObserver.observe(chartContainerRef.current);
        }

        return () => {
            resizeObserver.disconnect();
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
        };

    }, [isOpen, historicalData, stock.symbol, period, colors]);

    // Handle Escape key to close modal
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const modalContent = (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center overflow-hidden">
            {/* Dark overlay that covers everything */}
            <div 
                className="absolute inset-0 bg-black/60"
                onClick={onClose}
                role="presentation"
            />
            
            {/* Fullscreen chart modal */}
            <div className="relative w-screen h-screen flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-gray-700 bg-gray-900">
                    <div>
                        <h2 className="text-3xl font-bold text-white">{stock.symbol}</h2>
                        <p className="text-sm text-gray-400">{stock.company_name}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowSettings(true)}
                            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                            aria-label="Chart settings"
                            title="Chart Settings"
                        >
                            <Settings className="w-6 h-6 text-gray-400 hover:text-white" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-800 rounded-lg transition-colors shrink-0"
                            aria-label="Close chart (ESC)"
                        >
                            <X className="w-8 h-8 text-gray-400 hover:text-white" />
                        </button>
                    </div>
                </div>

                {/* Time Period Buttons */}
                <div className="flex gap-2 px-8 py-4 border-b border-gray-700 bg-gray-900 overflow-x-auto">
                    {(['1d', '5d', '1w', '1mo', '3mo', '6mo', '1y'] as TimePeriod[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                                period === p
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                        >
                            {p.toUpperCase()}
                        </button>
                    ))}
                </div>

                {/* Chart Container */}
                <div className="flex-1 relative bg-gray-900/50 overflow-hidden">
                    {(isLoading || !historicalData?.length) && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/70 z-20 gap-6">
                            <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
                            <p className="text-gray-300 text-lg font-medium">Loading chart data...</p>
                        </div>
                    )}
                    {error && !isLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/70 z-20 gap-4">
                            <AlertCircle className="w-20 h-20 text-red-400" />
                            <p className="text-red-400 text-lg font-medium">Failed to load chart data</p>
                        </div>
                    )}
                    <div
                        ref={chartContainerRef}
                        className="w-full h-full"
                    />
                </div>

                {/* Footer Stats */}
                <div className="px-8 py-5 border-t border-gray-700 bg-gray-900 grid grid-cols-4 gap-6">
                    <div>
                        <p className="text-gray-500 text-xs uppercase font-bold tracking-wide">Current Price</p>
                        <p className="text-white font-bold text-2xl mt-2">₹{stock.last_price?.toFixed(2) || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs uppercase font-bold tracking-wide">Change</p>
                        <p className={`font-bold text-2xl mt-2 ${(stock.change || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {(stock.change || 0) >= 0 ? '+' : ''}₹{stock.change?.toFixed(2) || 'N/A'}
                        </p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs uppercase font-bold tracking-wide">% Change</p>
                        <p className={`font-bold text-2xl mt-2 ${(stock.percent_change || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {(stock.percent_change || 0) >= 0 ? '+' : ''}{stock.percent_change?.toFixed(2) || 'N/A'}%
                        </p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs uppercase font-bold tracking-wide">Volume</p>
                        <p className="text-white font-bold text-2xl mt-2">
                            {stock.volume ? `${(stock.volume / 1000000).toFixed(2)}M` : 'N/A'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <SettingsPanel
                    colors={colors}
                    onColorsChange={setColors}
                    onClose={() => setShowSettings(false)}
                />
            )}
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default ChartModal;