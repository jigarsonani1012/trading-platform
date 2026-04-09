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

module.exports = { getStock, getHistoricalData, searchStocks, getMultipleStocks };