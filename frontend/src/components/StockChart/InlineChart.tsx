import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';
import type { IChartApi, Time } from 'lightweight-charts';
import { Loader2, AlertCircle } from 'lucide-react';
import { useHistoricalData } from '../../hooks/useStockData';

interface InlineChartProps {
    symbol: string;
    height?: number;
    period?: '1d' | '1w' | '1mo' | '3mo' | '6mo' | '1y';
    onChartClick?: () => void;
}

const InlineChart: React.FC<InlineChartProps> = ({ symbol, height = 250, period = '1mo', onChartClick }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const { data: historicalData, isLoading, error } = useHistoricalData(symbol, period, '1d');

    useEffect(() => {
        if (!chartContainerRef.current || !historicalData?.length || isLoading) return;

        const initializeChart = () => {
            if (chartRef.current) {
                chartRef.current.remove();
            }

            const container = chartContainerRef.current;
            if (!container) return;

            const width = container.clientWidth;
            if (!width || width <= 0) return;
            
            try {
                const chart = createChart(container, {
                    layout: {
                        background: { type: ColorType.Solid, color: '#0F172A' },
                        textColor: '#94A3B8',
                        fontSize: 11,
                    },
                    width,
                    height,
                    timeScale: {
                        timeVisible: false,
                        secondsVisible: false,
                    },
                    rightPriceScale: {
                        textColor: '#94A3B8',
                        borderColor: '#1E293B',
                    },
                    crosshair: {
                        mode: 1,
                        vertLine: { color: '#334155', width: 1, style: 1 },
                        horzLine: { color: '#334155', width: 1, style: 1 },
                    },
                    grid: {
                        horzLines: { color: '#1E293B' },
                        vertLines: { color: '#1E293B' },
                    },
                });

                const candlestickSeries = chart.addSeries(CandlestickSeries, {
                    upColor: '#10B981',
                    downColor: '#F87171',
                    borderUpColor: '#10B981',
                    borderDownColor: '#F87171',
                    wickUpColor: '#10B981',
                    wickDownColor: '#F87171',
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

                const handleResize = () => {
                    if (chartRef.current && container) {
                        const newWidth = container.clientWidth;
                        if (newWidth > 0) {
                            chartRef.current.applyOptions({ width: newWidth });
                        }
                    }
                };

                const resizeObserver = new ResizeObserver(() => handleResize());
                resizeObserver.observe(container);

                return () => {
                    resizeObserver.disconnect();
                };
            } catch (err) {
                console.error('Error initializing inline chart:', err);
            }
        };

        const timeoutId = setTimeout(() => initializeChart(), 50);
        
        return () => {
            clearTimeout(timeoutId);
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
        };
    }, [historicalData, symbol, height, isLoading]);

    return (
        <div 
            className="relative w-full rounded-lg overflow-hidden bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors"
            onClick={onChartClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onChartClick?.();
                }
            }}
        >
            {(isLoading || !historicalData?.length) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-10 gap-3">
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    <p className="text-gray-400 text-xs">Loading chart...</p>
                </div>
            )}
            {error && !isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-10 gap-2">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                    <p className="text-red-400 text-xs">Failed to load</p>
                </div>
            )}
            <div
                ref={chartContainerRef}
                className="w-full"
                style={{ height: `${height}px`, opacity: isLoading ? 0.5 : 1 }}
            />
            
            {/* Fullscreen overlay hint */}
            {!isLoading && historicalData?.length && (
                <div className="absolute top-3 right-3 opacity-0 hover:opacity-100 transition-opacity z-20">
                    <div className="bg-black/70 text-white text-xs px-3 py-1.5 rounded-md whitespace-nowrap">
                        Click to expand
                    </div>
                </div>
            )}
        </div>
    );
};

export default InlineChart;