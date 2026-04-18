const yfinanceService = require('../services/yfinanceService');

const getStock = async (req, res) => {
    try {
        const { symbol } = req.params;
        const data = await yfinanceService.getQuote(symbol);
        res.json({ status: 'success', data });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const getHistoricalData = async (req, res) => {
    try {
        const { symbol } = req.params;
        const { period = '1mo', interval = '1d' } = req.query;
        const data = await yfinanceService.getHistoricalData(symbol, period, interval);
        res.json({ status: 'success', data });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const searchStocks = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) {
            return res.status(400).json({ status: 'error', message: 'Search query too short' });
        }
        const results = await yfinanceService.searchStocks(q);
        res.json({ status: 'success', results });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const getMultipleStocks = async (req, res) => {
    try {
        const { symbols } = req.body;
        if (!symbols || !Array.isArray(symbols)) {
            return res.status(400).json({ status: 'error', message: 'Symbols array required' });
        }
        const results = await yfinanceService.getMultipleQuotes(symbols);
        res.json({ status: 'success', results });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const getChartData = async (req, res) => {
    try {
        const { symbol } = req.params;
        const { range = '1mo', interval = '1d' } = req.query;
        
        const validRanges = ['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', 'max'];
        const validIntervals = ['1m', '5m', '15m', '30m', '60m', '1d', '1wk', '1mo'];
        
        if (!validRanges.includes(range)) {
            return res.status(400).json({ 
                status: 'error', 
                message: `Invalid range. Use: ${validRanges.join(', ')}` 
            });
        }
        
        if (!validIntervals.includes(interval)) {
            return res.status(400).json({ 
                status: 'error', 
                message: `Invalid interval. Use: ${validIntervals.join(', ')}` 
            });
        }
        
        const historyData = await yfinanceService.getHistoricalData(symbol, range, interval);
        
        const chartData = historyData.map(point => ({
            time: new Date(point.time).getTime() / 1000,
            open: point.open,
            high: point.high,
            low: point.low,
            close: point.close,
            volume: point.volume
        }));
        
        const quote = await yfinanceService.getQuote(symbol);
        
        res.json({ 
            status: 'success', 
            symbol: symbol.toUpperCase(),
            range,
            interval,
            data: chartData,
            currentPrice: quote.last_price,
            companyName: quote.company_name
        });
    } catch (error) {
        console.error('Chart data error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: error.message 
        });
    }
};

module.exports = { getStock, getHistoricalData, searchStocks, getMultipleStocks, getChartData };