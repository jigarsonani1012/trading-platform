import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';
import type { IChartApi, Time } from 'lightweight-charts';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { useHistoricalData } from '../../hooks/useStockData';
import type { StockQuote } from '../../types/stock';
import { createPortal } from 'react-dom';

interface ChartModalProps {
    stock: StockQuote;
    isOpen: boolean;
    onClose: () => void;
}

type TimePeriod = '1d' | '1w' | '1mo' | '3mo' | '6mo' | '1y';

const ChartModal: React.FC<ChartModalProps> = ({ stock, isOpen, onClose }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);

    const [period, setPeriod] = useState<TimePeriod>('1mo');
    const [isDragging, setIsDragging] = useState(false);

    const interval = period === '1d' || period === '1w' ? '1m' : '1d';
    const periodForFetch = period === '1w' ? '5d' : period;

    const { data: historicalData, isLoading, error } =
        useHistoricalData(stock.symbol, periodForFetch, interval);

    // ----------------------------
    // CHART INIT / UPDATE
    // ----------------------------
    useEffect(() => {
        if (!isOpen || !chartContainerRef.current) return;
        if (!historicalData?.length) return;

        const container = chartContainerRef.current;

        const initChart = () => {
            if (!container) return;

            // cleanup old chart
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }

            const width = container.clientWidth;
            const height = container.clientHeight;

            if (width <= 0 || height <= 0) return;

            const chart = createChart(container, {
                layout: {
                    background: { type: ColorType.Solid, color: '#111827' },
                    textColor: '#9CA3AF',
                },
                width,
                height,

                handleScroll: {
                    mouseWheel: true,
                    pressedMouseMove: true, // 👈 enables drag
                    horzTouchDrag: true,
                    vertTouchDrag: true,
                },

                timeScale: {
                    timeVisible: true,
                    secondsVisible: false,
                },

                rightPriceScale: {
                    textColor: '#9CA3AF',
                },

                grid: {
                    vertLines: { color: '#1F2937' },
                    horzLines: { color: '#1F2937' },
                },
            });

            const series = chart.addSeries(CandlestickSeries, {
                upColor: '#10B981',
                downColor: '#EF4444',
                borderUpColor: '#10B981',
                borderDownColor: '#EF4444',
                wickUpColor: '#10B981',
                wickDownColor: '#EF4444',
            });

            const formatted = historicalData.map((point) => {
                let t =
                    typeof point.time === 'number'
                        ? point.time
                        : Math.floor(new Date(String(point.time)).getTime() / 1000);

                // IST shift (optional)
                t += 5.5 * 60 * 60;

                return {
                    time: t as unknown as Time,
                    open: point.open,
                    high: point.high,
                    low: point.low,
                    close: point.close,
                };
            });

            series.setData(formatted);
            chart.timeScale().fitContent();

            chartRef.current = chart;
        };

        const resize = () => {
            if (!chartRef.current || !container) return;

            const w = container.clientWidth;
            const h = container.clientHeight;

            if (w > 0 && h > 0) {
                chartRef.current.applyOptions({ width: w, height: h });
            }
        };

        const timeout = setTimeout(initChart, 100);

        const observer = new ResizeObserver(resize);
        observer.observe(container);

        return () => {
            clearTimeout(timeout);
            observer.disconnect();

            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
        };
    }, [isOpen, historicalData, period]);

    // ----------------------------
    // ESC CLOSE
    // ----------------------------
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', onKeyDown);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center">
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />

            <div className="relative w-screen h-screen flex flex-col">
                {/* HEADER */}
                <div className="flex justify-between items-center px-8 py-6 bg-gray-900 border-b border-gray-700">
                    <div>
                        <h2 className="text-3xl font-bold text-white">{stock.symbol}</h2>
                        <p className="text-gray-400 text-sm">{stock.company_name}</p>
                    </div>

                    <button onClick={onClose} className="cursor-pointer p-2 hover:bg-gray-800 rounded">
                        <X className="w-8 h-8 text-gray-400" />
                    </button>
                </div>

                {/* PERIOD */}
                <div className="flex gap-2 px-8 py-4 bg-gray-900 border-b border-gray-700 overflow-x-auto">
                    {(['1d', '1w', '1mo', '3mo', '6mo', '1y'] as TimePeriod[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-semibold ${period === p
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-800 text-gray-400'
                                }`}
                        >
                            {p.toUpperCase()}
                        </button>
                    ))}
                </div>

                {/* CHART */}
                <div className="flex-1 relative bg-gray-900/50 overflow-hidden">
                    {(isLoading || !historicalData?.length) && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/70 z-20">
                            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                            <p className="text-gray-300 mt-4">Loading chart...</p>
                        </div>
                    )}

                    {error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/70 z-20">
                            <AlertCircle className="w-16 h-16 text-red-400" />
                            <p className="text-red-400 mt-4">Failed to load data</p>
                        </div>
                    )}

                    <div
                        ref={chartContainerRef}
                        className="w-full h-full chart-container"
                        style={{
                            cursor: isDragging ? 'grabbing' : 'grab',
                        }}
                        onPointerDown={() => setIsDragging(true)}
                        onPointerUp={() => setIsDragging(false)}
                        onPointerLeave={() => setIsDragging(false)}
                        onPointerCancel={() => setIsDragging(false)}
                    />
                </div>

                {/* FOOTER */}
                <div className="px-8 py-5 bg-gray-900 border-t border-gray-700 grid grid-cols-4 gap-6">
                    <div>
                        <p className="text-gray-500 text-xs">Price</p>
                        <p className="text-white text-2xl font-bold">
                            ₹{stock.last_price?.toFixed(2) || 'N/A'}
                        </p>
                    </div>

                    <div>
                        <p className="text-gray-500 text-xs">Change</p>
                        <p className={`text-2xl font-bold ${(stock.change || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {(stock.change || 0) >= 0 ? '+' : ''}₹{stock.change?.toFixed(2)}
                        </p>
                    </div>

                    <div>
                        <p className="text-gray-500 text-xs">% Change</p>
                        <p className={`text-2xl font-bold ${(stock.percent_change || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {(stock.percent_change || 0) >= 0 ? '+' : ''}
                            {stock.percent_change?.toFixed(2)}%
                        </p>
                    </div>

                    <div>
                        <p className="text-gray-500 text-xs">Volume</p>
                        <p className="text-white text-2xl font-bold">
                            {stock.volume ? `${(stock.volume / 1_000_000).toFixed(2)}M` : 'N/A'}
                        </p>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ChartModal;