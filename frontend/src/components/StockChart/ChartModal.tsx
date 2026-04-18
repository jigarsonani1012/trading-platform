import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, CandlestickSeries, LineSeries } from 'lightweight-charts';
import type { IChartApi, Time, ISeriesApi, MouseEventParams } from 'lightweight-charts';
import {
    X, Loader2, AlertCircle, Moon, Sun, ChevronDown, TrendingUp,
    Ruler, Type, RotateCcw, Pin, Flag, StickyNote,
    MessageSquare, Tag, Image as ImageIcon, Lightbulb,
    Table, MapPin, FileText, Hash
} from 'lucide-react';
import { useHistoricalData } from '../../hooks/useStockData';
import type { StockQuote } from '../../types/stock';
import { createPortal } from 'react-dom';

interface ChartModalProps {
    stock: StockQuote;
    isOpen: boolean;
    onClose: () => void;
}

type TimePeriod = '1d' | '1w' | '1mo' | '3mo' | '6mo' | '1y';
type AnnotationType =
    | 'text' | 'note' | 'priceNote' | 'callout' | 'comment' | 'priceLabel'
    | 'pin' | 'flag' | 'signpost' | 'flagMark'
    | 'image' | 'post' | 'idea' | 'table';

interface Annotation {
    id: string;
    type: AnnotationType;
    time: Time;
    price: number;
    text: string;
    x: number | null;
    y: number | null;
    isEditing: boolean;
}

interface MeasurementPoint {
    time: Time;
    price: number;
    index: number;
}

interface MeasurementResult {
    priceDiff: number;
    percentChange: string;
    barCount: number;
    timeDuration: string;
}

const annotationConfig: Record<AnnotationType, { icon: React.ReactNode; label: string; defaultText: string; color: string }> = {
    text: { icon: <Type size={14} />, label: 'Text', defaultText: 'Text', color: '#3B82F6' },
    note: { icon: <StickyNote size={14} />, label: 'Note', defaultText: 'Note', color: '#10B981' },
    priceNote: { icon: <Tag size={14} />, label: 'Price Note', defaultText: 'Price: ₹0.00', color: '#F59E0B' },
    callout: { icon: <MessageSquare size={14} />, label: 'Callout', defaultText: 'Important!', color: '#EF4444' },
    comment: { icon: <MessageSquare size={14} />, label: 'Comment', defaultText: 'Comment', color: '#8B5CF6' },
    priceLabel: { icon: <Hash size={14} />, label: 'Price Label', defaultText: '₹0.00', color: '#06B6D4' },
    pin: { icon: <Pin size={14} />, label: 'Pin', defaultText: 'Pinned', color: '#EC4899' },
    flag: { icon: <Flag size={14} />, label: 'Flag', defaultText: 'Flag', color: '#F97316' },
    signpost: { icon: <MapPin size={14} />, label: 'Signpost', defaultText: 'Sign', color: '#14B8A6' },
    flagMark: { icon: <Flag size={14} />, label: 'Flag Mark', defaultText: 'Alert', color: '#DC2626' },
    image: { icon: <ImageIcon size={14} />, label: 'Image', defaultText: '📷 Image', color: '#A855F7' },
    post: { icon: <FileText size={14} />, label: 'Post', defaultText: 'Post', color: '#3B82F6' },
    idea: { icon: <Lightbulb size={14} />, label: 'Idea', defaultText: 'Idea', color: '#EAB308' },
    table: { icon: <Table size={14} />, label: 'Table', defaultText: 'Table data', color: '#6B7280' },
};

let globalDarkMode = true;
const themeListeners: ((isDark: boolean) => void)[] = [];

const setGlobalDarkMode = (isDark: boolean) => {
    globalDarkMode = isDark;
    themeListeners.forEach(listener => listener(isDark));
};

const formatTimeDuration = (startTime: number, endTime: number): string => {
    const diffSeconds = Math.abs(endTime - startTime);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
        return `${diffDays}d ${diffHours % 24}h`;
    } else if (diffHours > 0) {
        return `${diffHours}h ${diffMinutes % 60}m`;
    } else if (diffMinutes > 0) {
        return `${diffMinutes}m`;
    }
    return `${diffSeconds}s`;
};

const formatCurrency = (value: number) => `₹${value.toFixed(2)}`;

const ChartModal: React.FC<ChartModalProps> = ({ stock, isOpen, onClose }) => {

    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const chartDataRef = useRef<{ time: Time; close: number }[]>([]);
    const isMeasuringRef = useRef(false);
    const selectedToolRef = useRef<string | null>(null);
    const measurementStartRef = useRef<MeasurementPoint | null>(null);

    // Annotations state
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [textInputValue, setTextInputValue] = useState('');
    const textInputRef = useRef<HTMLInputElement>(null);
    const [showAnnotationsMenu, setShowAnnotationsMenu] = useState(false);

    // Measurement state
    const [isMeasuring, setIsMeasuring] = useState(false);
    const [measurementStart, setMeasurementStart] = useState<MeasurementPoint | null>(null);
    const [measurementPreview, setMeasurementPreview] = useState<MeasurementPoint | null>(null);
    const [measurementEnd, setMeasurementEnd] = useState<MeasurementPoint | null>(null);
    const [measurementResult, setMeasurementResult] = useState<MeasurementResult | null>(null);

    const [period, setPeriod] = useState<TimePeriod>('1d');
    const [isDragging, setIsDragging] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(globalDarkMode);
    const [showOHLC, setShowOHLC] = useState(false);
    const [ohlc, setOhlc] = useState<{ open: number; high: number; low: number; close: number } | null>(null);
    const [showTimeframeDropdown, setShowTimeframeDropdown] = useState(false);
    const [selectedTool, setSelectedTool] = useState<string | null>(null);
    const [smaEnabled, setSmaEnabled] = useState(false);
    const [indianTime, setIndianTime] = useState<string>('');

    const interval = period === '1d' ? '5m' : period === '1w' ? '15m' : '1d';
    const periodForFetch = period === '1w' ? '5d' : period;

    const { data: historicalData, isLoading, error } = useHistoricalData(stock.symbol, periodForFetch, interval);

    useEffect(() => {
        const handleThemeChange = (isDark: boolean) => {
            setIsDarkMode(isDark);
        };
        themeListeners.push(handleThemeChange);
        return () => {
            const index = themeListeners.indexOf(handleThemeChange);
            if (index > -1) themeListeners.splice(index, 1);
        };
    }, []);

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const indiaTime = now.toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
            });
            setIndianTime(indiaTime);
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);

        return () => clearInterval(interval);
    }, []);

    const calculateSMA = (data: { time: Time; close: number }[], period: number = 20) => {
        const sma = [];
        for (let i = period - 1; i < data.length; i++) {
            const sum = data.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val.close, 0);
            sma.push({
                time: data[i].time,
                value: sum / period,
            });
        }
        return sma;
    };

    const buildMeasurementResult = useCallback((start: MeasurementPoint, end: MeasurementPoint): MeasurementResult => {
        const priceDiff = end.price - start.price;
        const percentChangeVal = start.price === 0 ? 0 : (priceDiff / start.price) * 100;

        return {
            priceDiff,
            percentChange: `${priceDiff >= 0 ? '+' : ''}${percentChangeVal.toFixed(3)}%`,
            barCount: Math.abs(end.index - start.index) + 1,
            timeDuration: formatTimeDuration(start.time as number, end.time as number),
        };
    }, []);

    const clearMeasurement = useCallback(() => {
        measurementStartRef.current = null;
        setIsMeasuring(false);
        setMeasurementStart(null);
        setMeasurementPreview(null);
        setMeasurementEnd(null);
        setMeasurementResult(null);
    }, []);

    const getScreenPoint = (point: MeasurementPoint) => {
        const chart = chartRef.current;
        const series = candlestickSeriesRef.current;
        if (!chart || !series) return null;

        const x = chart.timeScale().timeToCoordinate(point.time);
        const y = series.priceToCoordinate(point.price);

        if (x == null || y == null) return null;

        return { x, y };
    };

    const createMeasurementPoint = useCallback((param: MouseEventParams): MeasurementPoint | null => {
        const chart = chartRef.current;
        const series = candlestickSeriesRef.current;

        if (!chart || !series || !param.time || !param.point) return null;

        const price = series.coordinateToPrice(param.point.y);
        const index = chartDataRef.current.findIndex((d) => d.time === param.time);

        if (price === null || price === undefined || index < 0) {
            return null;
        }

        return { time: param.time, price, index };
    }, []);

    const updateAnnotationCoordinates = useCallback(() => {
        if (!chartRef.current) return;

        setAnnotations(prev => prev.map(ann => {
            const timeScale = chartRef.current?.timeScale();
            const x = timeScale?.timeToCoordinate(ann.time);
            const y = candlestickSeriesRef.current?.priceToCoordinate(ann.price);
            return {
                ...ann,
                x: x !== null && x !== undefined ? x : null,
                y: y !== null && y !== undefined ? y : null,
            };
        }));
    }, []);

    const addAnnotation = (type: AnnotationType, time: Time, price: number) => {
        const config = annotationConfig[type];
        let defaultText = config.defaultText;

        if (type === 'priceNote' || type === 'priceLabel') {
            defaultText = config.defaultText.replace('0.00', price.toFixed(2));
        }

        const newAnnotation: Annotation = {
            id: `${type}-${Date.now()}-${Math.random()}`,
            type,
            time,
            price,
            text: defaultText,
            x: null,
            y: null,
            isEditing: true
        };
        setAnnotations(prev => [...prev, newAnnotation]);
        setEditingId(newAnnotation.id);
        setTextInputValue(defaultText);
        setTimeout(() => textInputRef.current?.focus(), 100);
        setTimeout(() => updateAnnotationCoordinates(), 50);
    };

    const updateAnnotation = (id: string, newText: string) => {
        setAnnotations(prev => prev.map(ann =>
            ann.id === id ? { ...ann, text: newText, isEditing: false } : ann
        ));
        setEditingId(null);
        setTextInputValue('');
    };

    const deleteAnnotation = (id: string) => {
        setAnnotations(prev => prev.filter(ann => ann.id !== id));
    };

    const getAnnotationStyle = (type: AnnotationType) => {
        const colorMap: Record<string, string> = {
            '#3B82F6': 'bg-blue-500',
            '#10B981': 'bg-green-500',
            '#F59E0B': 'bg-amber-500',
            '#EF4444': 'bg-red-500',
            '#8B5CF6': 'bg-purple-500',
            '#06B6D4': 'bg-cyan-500',
            '#EC4899': 'bg-pink-500',
            '#F97316': 'bg-orange-500',
            '#14B8A6': 'bg-teal-500',
            '#DC2626': 'bg-red-600',
            '#A855F7': 'bg-purple-500',
            '#EAB308': 'bg-yellow-500',
            '#6B7280': 'bg-gray-500',
        };
        return colorMap[annotationConfig[type].color] || 'bg-blue-500';
    };

    const handleMeasure = () => {
        if (isMeasuring) {
            clearMeasurement();
        } else {
            setIsMeasuring(true);
            measurementStartRef.current = null;
            setMeasurementStart(null);
            setMeasurementPreview(null);
            setMeasurementEnd(null);
            setMeasurementResult(null);
            setSelectedTool(null);
            setSmaEnabled(false);
        }
    };

    const handleSMA = () => {
        setSmaEnabled(!smaEnabled);
        setSelectedTool(null);
        setShowAnnotationsMenu(false);
        clearMeasurement();
    };

    const handleAnnotationSelect = (type: AnnotationType) => {
        setSelectedTool(type);
        setShowAnnotationsMenu(false);
        setSmaEnabled(false);
        clearMeasurement();
    };

    const handleReset = () => {
        if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
            updateAnnotationCoordinates();
        }
    };

    const handleThemeChange = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        setGlobalDarkMode(newMode);
    };

    // CHART INIT / UPDATE     
    useEffect(() => {
        if (!isOpen || !chartContainerRef.current) return;
        if (!historicalData?.length) return;

        const container = chartContainerRef.current;

        const initChart = () => {
            if (!container) return;

            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }

            const width = container.clientWidth;
            const height = container.clientHeight;

            if (width <= 0 || height <= 0) return;

            const chart = createChart(container, {
                layout: {
                    background: {
                        type: ColorType.Solid,
                        color: isDarkMode ? '#111827' : '#FFFFFF'
                    },
                    textColor: isDarkMode ? '#9CA3AF' : '#1F2937',
                },
                width,
                height,
                handleScroll: {
                    mouseWheel: true,
                    pressedMouseMove: true,
                    horzTouchDrag: true,
                    vertTouchDrag: true,
                },
                timeScale: {
                    timeVisible: true,
                    secondsVisible: false,
                },
                rightPriceScale: {
                    textColor: isDarkMode ? '#9CA3AF' : '#1F2937',
                    borderColor: isDarkMode ? '#1F2937' : '#E5E7EB',
                },
                grid: {
                    vertLines: { color: isDarkMode ? '#1F2937' : '#F3F4F6' },
                    horzLines: { color: isDarkMode ? '#1F2937' : '#F3F4F6' },
                },
                crosshair: {
                    mode: 1,
                    vertLine: { color: isDarkMode ? '#4B5563' : '#9CA3AF', width: 1, style: 2 },
                    horzLine: { color: isDarkMode ? '#4B5563' : '#9CA3AF', width: 1, style: 2 },
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
            candlestickSeriesRef.current = series;

            const formatted = historicalData.map((point) => {
                const time = typeof point.time === 'number'
                    ? point.time
                    : Math.floor(new Date(String(point.time)).getTime() / 1000);
                return {
                    time: time as Time,
                    open: point.open,
                    high: point.high,
                    low: point.low,
                    close: point.close,
                };
            });

            chartDataRef.current = formatted.map(d => ({ time: d.time, close: d.close }));

            series.setData(formatted);
            chart.timeScale().fitContent();

            if (smaEnabled) {
                const smaData = calculateSMA(formatted, 20);
                const smaSeries = chart.addSeries(LineSeries, {
                    color: '#F59E0B',
                    lineWidth: 2,
                    priceLineVisible: false,
                });
                smaSeries.setData(smaData);
            }

            chart.subscribeCrosshairMove((param: MouseEventParams) => {
                if (!param.time || !param.seriesData.size) {
                    setShowOHLC(false);
                    setOhlc(null);
                    if (isMeasuringRef.current && measurementStartRef.current) {
                        setMeasurementPreview(null);
                    }
                    return;
                }

                const data = param.seriesData.get(series) as { open: number; high: number; low: number; close: number } | undefined;
                if (data && 'open' in data) {
                    setOhlc({
                        open: data.open,
                        high: data.high,
                        low: data.low,
                        close: data.close,
                    });
                    setShowOHLC(true);
                }

                if (isMeasuringRef.current && measurementStartRef.current) {
                    const previewPoint = createMeasurementPoint(param);
                    if (previewPoint) {
                        setMeasurementPreview(previewPoint);
                        setMeasurementResult(buildMeasurementResult(measurementStartRef.current, previewPoint));
                    }
                }
            });

            chart.subscribeClick((param: MouseEventParams) => {
                const measurementPoint = createMeasurementPoint(param);
                if (!measurementPoint) return;

                // MEASUREMENT MODE
                if (isMeasuringRef.current) {
                    if (!measurementStartRef.current) {
                        measurementStartRef.current = measurementPoint;
                        setMeasurementStart(measurementPoint);
                        setMeasurementPreview(measurementPoint);
                        setMeasurementEnd(null);
                        setMeasurementResult(null);
                    } else {
                        setMeasurementEnd(measurementPoint);
                        setMeasurementPreview(null);
                        setMeasurementResult(
                            buildMeasurementResult(
                                measurementStartRef.current,
                                measurementPoint
                            )
                        );
                        setIsMeasuring(false);
                    }
                    return;
                }

                // ANNOTATION TOOLS
                if (selectedToolRef.current && selectedToolRef.current !== 'sma') {
                    addAnnotation(selectedToolRef.current as AnnotationType, measurementPoint.time, measurementPoint.price);
                    setSelectedTool(null);
                    setShowAnnotationsMenu(false);
                }
            });

            chart.timeScale().subscribeVisibleTimeRangeChange(() => {
                updateAnnotationCoordinates();
            });

            chartRef.current = chart;
            setTimeout(() => updateAnnotationCoordinates(), 100);
        };

        const resize = () => {
            if (!chartRef.current || !container) return;
            const w = container.clientWidth;
            const h = container.clientHeight;
            if (w > 0 && h > 0) {
                chartRef.current.applyOptions({ width: w, height: h });
                updateAnnotationCoordinates();
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
            candlestickSeriesRef.current = null;
        };
    }, [isOpen, historicalData, isDarkMode, smaEnabled, createMeasurementPoint, buildMeasurementResult, updateAnnotationCoordinates]);

    useEffect(() => {
        isMeasuringRef.current = isMeasuring;
    }, [isMeasuring]);

    useEffect(() => {
        selectedToolRef.current = selectedTool;
    }, [selectedTool]);

    useEffect(() => {
        if (chartRef.current && annotations.length > 0) {
            updateAnnotationCoordinates();
        }
    }, [annotations, updateAnnotationCoordinates]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (editingId) {
                    setEditingId(null);
                    setTextInputValue('');
                } else if (isMeasuring) {
                    clearMeasurement();
                } else if (selectedTool) {
                    setSelectedTool(null);
                } else {
                    onClose();
                }
            }
        };
        if (isOpen) {
            document.addEventListener('keydown', onKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose, editingId, selectedTool, isMeasuring, clearMeasurement]);

    if (!isOpen) return null;

    const annotationCategories = {
        text: ['text', 'note', 'priceNote', 'callout', 'comment', 'priceLabel'],
        drawing: ['pin', 'flag', 'signpost', 'flagMark'],
        content: ['image', 'post', 'idea', 'table'],
    };

    const measurementTarget = measurementEnd ?? measurementPreview;

    const startScreen = measurementStart ? getScreenPoint(measurementStart) : null;
    const endScreen = measurementTarget ? getScreenPoint(measurementTarget) : null;

    const hasScreenPoints = !!(startScreen && endScreen);
    const chartWidth = chartContainerRef.current?.clientWidth ?? 0;
    const measurementTone = measurementResult && measurementResult.priceDiff >= 0
        ? {
            solid: '#16a34a',
            soft: 'rgba(34, 197, 94, 0.12)',
            line: 'rgba(34, 197, 94, 0.85)',
            textClass: 'text-green-400',
        }
        : {
            solid: '#dc2626',
            soft: 'rgba(239, 68, 68, 0.12)',
            line: 'rgba(239, 68, 68, 0.85)',
            textClass: 'text-red-400',
        };

    return createPortal(
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />

            <div className="relative w-screen h-screen flex flex-col">
                {/* HEADER */}
                <div className={`flex justify-between items-center px-8 py-6 border-b ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div>
                        <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stock.symbol}</h2>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{stock.company_name}</p>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'} mt-1`}>🕐 {indianTime}</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleThemeChange}
                            className={`cursor-pointer p-2 rounded transition-colors ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                        >
                            {isDarkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
                        </button>
                        <button onClick={onClose} className={`cursor-pointer p-2 rounded transition-colors ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                            <X className={`w-8 h-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                        </button>
                    </div>
                </div>

                {/* TIMEFRAME & TOOLS */}
                <div className={`flex justify-between items-center px-8 py-4 border-b ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="relative">
                        <button
                            onClick={() => setShowTimeframeDropdown(!showTimeframeDropdown)}
                            className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'}`}
                        >
                            {period.toUpperCase()}
                            <ChevronDown className="w-4 h-4" />
                        </button>

                        {showTimeframeDropdown && (
                            <div className={`absolute top-full left-0 mt-2 rounded-lg shadow-lg z-40 ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                                {(['1d', '1w', '1mo', '3mo', '6mo', '1y'] as TimePeriod[]).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => { setPeriod(p); setShowTimeframeDropdown(false); }}
                                        className={`cursor-pointer block w-full text-left px-4 py-2 text-sm ${period === p
                                            ? isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-900'
                                            : isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                                            }`}
                                    >
                                        {p.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 items-center">
                        <div className="relative">
                            {showAnnotationsMenu && (
                                <div className={`absolute top-full right-0 mt-2 rounded-lg shadow-xl z-50 min-w-50 ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                                    <div className="p-2">
                                        <div className={`text-xs font-semibold px-3 py-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>TEXT & NOTES</div>
                                        {annotationCategories.text.map((type) => (
                                            <button
                                                key={type}
                                                onClick={() => handleAnnotationSelect(type as AnnotationType)}
                                                className={`flex items-center gap-2 w-full px-3 py-2 rounded text-sm ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
                                            >
                                                {annotationConfig[type as AnnotationType].icon}
                                                <span>{annotationConfig[type as AnnotationType].label}</span>
                                            </button>
                                        ))}

                                        <div className={`text-xs font-semibold px-3 py-2 mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>DRAWING</div>
                                        {annotationCategories.drawing.map((type) => (
                                            <button
                                                key={type}
                                                onClick={() => handleAnnotationSelect(type as AnnotationType)}
                                                className={`flex items-center gap-2 w-full px-3 py-2 rounded text-sm ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
                                            >
                                                {annotationConfig[type as AnnotationType].icon}
                                                <span>{annotationConfig[type as AnnotationType].label}</span>
                                            </button>
                                        ))}

                                        <div className={`text-xs font-semibold px-3 py-2 mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>CONTENT</div>
                                        {annotationCategories.content.map((type) => (
                                            <button
                                                key={type}
                                                onClick={() => handleAnnotationSelect(type as AnnotationType)}
                                                className={`flex items-center gap-2 w-full px-3 py-2 rounded text-sm ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
                                            >
                                                {annotationConfig[type as AnnotationType].icon}
                                                <span>{annotationConfig[type as AnnotationType].label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleMeasure}
                            className={`cursor-pointer p-2 rounded transition-colors ${isMeasuring
                                ? isDarkMode ? 'bg-blue-600' : 'bg-blue-500'
                                : isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'
                                }`}
                            title="Price Measurement"
                        >
                            <Ruler className={`w-4 h-4 ${isMeasuring ? 'text-white' : isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                        </button>

                        <button
                            onClick={handleSMA}
                            className={`cursor-pointer p-2 rounded transition-colors ${smaEnabled
                                ? isDarkMode ? 'bg-orange-600' : 'bg-orange-500'
                                : isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'
                                }`}
                            title="SMA (20)"
                        >
                            <TrendingUp className={`w-4 h-4 ${smaEnabled ? 'text-white' : isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                        </button>

                        <div className="w-px bg-gray-600 mx-1" />

                        <button
                            onClick={handleReset}
                            className={`cursor-pointer p-2 rounded transition-colors ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'}`}
                            title="Reset View"
                        >
                            <RotateCcw className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                        </button>
                    </div>
                </div>

                {/* CHART */}
                <div className={`flex-1 relative overflow-hidden ${isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                    {(isLoading || !historicalData?.length) && (
                        <div className={`absolute inset-0 flex flex-col items-center justify-center z-20 ${isDarkMode ? 'bg-gray-900/70' : 'bg-white/70'}`}>
                            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                            <p className={`mt-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Loading chart...</p>
                        </div>
                    )}

                    {error && (
                        <div className={`absolute inset-0 flex flex-col items-center justify-center z-20 ${isDarkMode ? 'bg-gray-900/70' : 'bg-white/70'}`}>
                            <AlertCircle className="w-16 h-16 text-red-400" />
                            <p className={`mt-4 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>Failed to load data</p>
                        </div>
                    )}

                    {/* MEASUREMENT RESULT */}
                    {hasScreenPoints && measurementResult && (() => {
                        const startX = startScreen!.x;
                        const startY = startScreen!.y;
                        const endX = endScreen!.x;
                        const endY = endScreen!.y;

                        const dx = endX - startX;
                        const dy = endY - startY;

                        const isRight = dx >= 0;
                        const isDown = dy >= 0;

                        const leftX = Math.min(startX, endX);
                        const rightX = Math.max(startX, endX);
                        const topY = Math.min(startY, endY);
                        const bottomY = Math.max(startY, endY);

                        const midX = (startX + endX) / 2;
                        const midY = (startY + endY) / 2;

                        const isUpMove = measurementResult.priceDiff >= 0;

                        const hArrowX = isRight ? rightX : leftX;
                        const vArrowY = isDown ? bottomY : topY;

                        return (
                            <>
                                <div
                                    className="absolute z-20 pointer-events-none"
                                    style={{
                                        left: leftX,
                                        top: topY,
                                        width: rightX - leftX,
                                        height: bottomY - topY,
                                        backgroundColor: measurementTone.soft,
                                    }}
                                />

                                <div
                                    className="absolute z-20 pointer-events-none"
                                    style={{
                                        left: leftX,
                                        top: midY,
                                        width: rightX - leftX,
                                        height: 2,
                                        backgroundColor: measurementTone.solid,
                                    }}
                                />

                                <div
                                    className="absolute z-20 pointer-events-none"
                                    style={{
                                        left: midX,
                                        top: topY,
                                        width: 1,
                                        height: bottomY - topY,
                                        backgroundColor: measurementTone.line,
                                    }}
                                />

                                <div
                                    className="absolute z-20 pointer-events-none"
                                    style={{
                                        left: hArrowX,
                                        top: midY - 5,
                                        width: 0,
                                        height: 0,
                                        borderTop: '5px solid transparent',
                                        borderBottom: '5px solid transparent',
                                        borderLeft: isRight
                                            ? `7px solid ${measurementTone.solid}`
                                            : 'none',
                                        borderRight: !isRight
                                            ? `7px solid ${measurementTone.solid}`
                                            : 'none',
                                    }}
                                />

                                <div
                                    className="absolute z-20 pointer-events-none"
                                    style={{
                                        left: midX - 5,
                                        top: vArrowY,
                                        width: 0,
                                        height: 0,
                                        borderLeft: '5px solid transparent',
                                        borderRight: '5px solid transparent',
                                        borderTop: isDown
                                            ? `7px solid ${measurementTone.solid}`
                                            : 'none',
                                        borderBottom: !isDown
                                            ? `7px solid ${measurementTone.solid}`
                                            : 'none',
                                    }}
                                />

                                <div
                                    className={`absolute z-30 px-3 py-2 rounded-md text-xs font-semibold pointer-events-none shadow-lg ${isDarkMode ? 'bg-gray-900/95 border border-gray-700' : 'bg-white/95 border border-gray-200'}`}
                                    style={{
                                        left: Math.min(Math.max(midX, 120), Math.max(chartWidth - 120, 120)),
                                        top: Math.max(topY - 58, 10),
                                        transform: 'translateX(-50%)',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    <div className={measurementTone.textClass}>
                                        {isUpMove ? '+' : ''}
                                        {measurementResult.priceDiff.toFixed(2)} ({measurementResult.percentChange})
                                    </div>
                                    <div className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {measurementResult.barCount} bars · {measurementResult.timeDuration}
                                    </div>
                                </div>
                                <div
                                    className="absolute z-20 pointer-events-none"
                                    style={{
                                        left: rightX,
                                        top: startY,
                                        width: Math.max(chartWidth - rightX - 76, 12),
                                        height: 1,
                                        backgroundColor: 'rgba(148, 163, 184, 0.8)',
                                    }}
                                />
                                <div
                                    className="absolute z-20 pointer-events-none"
                                    style={{
                                        left: rightX,
                                        top: endY,
                                        width: Math.max(chartWidth - rightX - 76, 12),
                                        height: 1,
                                        backgroundColor: measurementTone.line,
                                    }}
                                />
                                <div
                                    className="absolute z-30 pointer-events-none rounded-md bg-gray-700 px-2 py-1 text-[11px] font-semibold text-white shadow"
                                    style={{
                                        right: 8,
                                        top: Math.max(startY - 14, 12),
                                    }}
                                >
                                    {formatCurrency(measurementStart!.price)}
                                </div>
                                <div
                                    className="absolute z-30 pointer-events-none rounded-md px-2 py-1 text-[11px] font-semibold text-white shadow"
                                    style={{
                                        right: 8,
                                        top: Math.max(endY - 14, 12),
                                        backgroundColor: measurementTone.solid,
                                    }}
                                >
                                    {formatCurrency(measurementTarget!.price)}
                                </div>
                            </>
                        );
                    })()}

                    {/* MEASUREMENT INSTRUCTIONS */}
                    {isMeasuring && !measurementStart && (
                        <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 z-30 px-4 py-2 rounded-lg shadow-lg ${isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'}`}>
                            <div className="text-sm font-medium">📍 Click start point</div>
                        </div>
                    )}

                    {isMeasuring && measurementStart && !measurementEnd && (
                        <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 z-30 px-4 py-2 rounded-lg shadow-lg ${isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'}`}>
                            <div className="text-sm font-medium">📍 Click end point</div>
                        </div>
                    )}

                    {/* OHLC DISPLAY */}
                    {showOHLC && ohlc && (
                        <div className={`absolute top-4 left-4 z-30 p-3 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-300'}`}>
                            <div className={`text-xs font-mono ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                <div className="flex gap-3 items-center flex-wrap">
                                    <div>O: <span className={`font-bold ${ohlc.close >= ohlc.open ? 'text-green-500' : 'text-red-500'}`}>₹{ohlc.open.toFixed(2)}</span></div>
                                    <div>H: <span className={`font-bold ${ohlc.close >= ohlc.open ? 'text-green-500' : 'text-red-500'}`}>₹{ohlc.high.toFixed(2)}</span></div>
                                    <div>L: <span className={`font-bold ${ohlc.close >= ohlc.open ? 'text-green-500' : 'text-red-500'}`}>₹{ohlc.low.toFixed(2)}</span></div>
                                    <div>C: <span className={`font-bold ${ohlc.close >= ohlc.open ? 'text-green-500' : 'text-red-500'}`}>₹{ohlc.close.toFixed(2)}</span></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ANNOTATIONS */}
                    {annotations.map((annotation) => (
                        annotation.x !== null && annotation.y !== null && (
                            <div
                                key={annotation.id}
                                className="absolute z-30"
                                style={{
                                    left: annotation.x,
                                    top: annotation.y - 12,
                                    transform: 'translateX(-50%)',
                                }}
                            >
                                {editingId === annotation.id ? (
                                    <div className="flex items-center gap-1">
                                        <input
                                            ref={textInputRef}
                                            type="text"
                                            value={textInputValue}
                                            onChange={(e) => setTextInputValue(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    updateAnnotation(annotation.id, textInputValue);
                                                } else if (e.key === 'Escape') {
                                                    setEditingId(null);
                                                    setTextInputValue('');
                                                }
                                            }}
                                            onBlur={() => updateAnnotation(annotation.id, textInputValue)}
                                            className={`px-2 py-1 text-sm rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                            style={{ minWidth: '120px' }}
                                            autoFocus
                                        />
                                    </div>
                                ) : (
                                    <div className={`group relative px-2 py-1 text-xs rounded shadow-lg cursor-pointer ${getAnnotationStyle(annotation.type)} text-white whitespace-nowrap`}>
                                        <div className="flex items-center gap-1">
                                            {annotationConfig[annotation.type]?.icon}
                                            <span>{annotation.text}</span>
                                        </div>
                                        <button
                                            onClick={() => deleteAnnotation(annotation.id)}
                                            className="absolute -top-2 -right-2 hidden group-hover:flex w-4 h-4 rounded-full bg-red-500 text-white items-center justify-center text-xs"
                                        >
                                            ×
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    ))}

                    {/* TOOL STATUS */}
                    {smaEnabled && (
                        <div className={`absolute top-4 right-4 z-30 px-3 py-1 rounded text-xs font-medium ${isDarkMode ? 'bg-orange-600 text-white' : 'bg-orange-500 text-white'}`}>
                            📈 SMA(20) Active
                        </div>
                    )}

                    <div
                        ref={chartContainerRef}
                        className="w-full h-full chart-container"
                        style={{
                            cursor: isMeasuring ? 'crosshair' : selectedTool ? 'crosshair' : isDragging ? 'grabbing' : 'grab',
                        }}
                        onPointerDown={() => setIsDragging(true)}
                        onPointerUp={() => setIsDragging(false)}
                        onPointerLeave={() => setIsDragging(false)}
                        onPointerCancel={() => setIsDragging(false)}
                    />
                </div>

                {/* FOOTER */}
                <div className={`px-8 py-5 border-t grid grid-cols-4 gap-6 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>Price</p>
                        <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{stock.last_price?.toFixed(2) || 'N/A'}</p>
                    </div>
                    <div>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>Change</p>
                        <p className={`text-2xl font-bold ${(stock.change || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {(stock.change || 0) >= 0 ? '+' : ''}₹{stock.change?.toFixed(2)}
                        </p>
                    </div>
                    <div>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>% Change</p>
                        <p className={`text-2xl font-bold ${(stock.percent_change || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {(stock.percent_change || 0) >= 0 ? '+' : ''}{stock.percent_change?.toFixed(2)}%
                        </p>
                    </div>
                    <div>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>Volume</p>
                        <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
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