const DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
    'Accept': 'application/json',
};

const SEARCH_URL = 'https://query1.finance.yahoo.com/v1/finance/search';
const CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

class YFinanceService {
    getSearchQueries(query) {
        const normalized = query.trim();
        const queries = [normalized];

        if (/\bsip\b/i.test(normalized)) {
            queries.push(normalized.replace(/\bsip\b/gi, 'mutual fund').trim());
        }

        if (/\bmutual fund\b/i.test(normalized)) {
            queries.push(normalized.replace(/\bmutual fund\b/gi, 'fund').trim());
        }

        return [...new Set(queries.filter(Boolean))];
    }

    buildTickerCandidates(symbol) {
        const normalized = symbol.trim().toUpperCase();

        if (normalized.includes('.') || normalized.startsWith('^')) {
            return [normalized];
        }

        return [`${normalized}.NS`, `${normalized}.BO`, normalized];
    }

    async fetchJson(url) {
        const response = await fetch(url, { headers: DEFAULT_HEADERS });

        if (!response.ok) {
            throw new Error(`Yahoo Finance request failed with ${response.status}`);
        }

        return response.json();
    }

    mapQuote(symbol, meta) {
        const currentPrice = meta.regularMarketPrice ?? meta.previousClose ?? meta.chartPreviousClose ?? 0;
        const previousClose = meta.previousClose ?? meta.chartPreviousClose ?? currentPrice;
        const change = currentPrice - previousClose;
        const percentChange = previousClose ? (change / previousClose) * 100 : 0;

        return {
            symbol: symbol.toUpperCase(),
            ticker: meta.symbol,
            company_name: meta.longName || meta.shortName || symbol.toUpperCase(),
            last_price: currentPrice,
            change,
            percent_change: percentChange,
            previous_close: previousClose,
            open: meta.regularMarketOpen ?? previousClose,
            day_high: meta.regularMarketDayHigh ?? currentPrice,
            day_low: meta.regularMarketDayLow ?? currentPrice,
            year_high: meta.fiftyTwoWeekHigh ?? currentPrice,
            year_low: meta.fiftyTwoWeekLow ?? currentPrice,
            volume: meta.regularMarketVolume ?? 0,
            market_cap: meta.marketCap ?? 0,
            pe_ratio: meta.trailingPE ?? null,
            currency: meta.currency ?? 'INR',
            exchange: meta.exchangeName ?? meta.fullExchangeName ?? null,
            timestamp: new Date().toISOString(),
        };
    }

    async getChartResult(ticker, range = '1d', interval = '1d') {
        const url = `${CHART_URL}/${encodeURIComponent(ticker)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}&includePrePost=false`;
        const payload = await this.fetchJson(url);
        const result = payload.chart?.result?.[0];
        const error = payload.chart?.error;

        if (error) {
            throw new Error(error.description || `Failed to load chart data for ${ticker}`);
        }

        if (!result) {
            throw new Error(`No chart data found for ${ticker}`);
        }

        return result;
    }

    async getQuote(symbol) {
        let lastError = null;

        for (const ticker of this.buildTickerCandidates(symbol)) {
            try {
                const result = await this.getChartResult(ticker, '1d', '1m');
                return this.mapQuote(symbol, result.meta || {});
            } catch (error) {
                lastError = error;
            }
        }

        throw lastError || new Error(`Unable to fetch quote for ${symbol}`);
    }

    async getHistoricalData(symbol, period = '1mo', interval = '1d') {
        let lastError = null;

        for (const ticker of this.buildTickerCandidates(symbol)) {
            try {
                const result = await this.getChartResult(ticker, period, interval);
                const quote = result.indicators?.quote?.[0];
                const timestamps = result.timestamp || [];

                if (!quote || timestamps.length === 0) {
                    return [];
                }

                return timestamps
                    .map((timestamp, index) => ({
                        time: new Date(timestamp * 1000).toISOString(),
                        open: quote.open?.[index] ?? null,
                        high: quote.high?.[index] ?? null,
                        low: quote.low?.[index] ?? null,
                        close: quote.close?.[index] ?? null,
                        volume: quote.volume?.[index] ?? 0,
                    }))
                    .filter((row) => row.close !== null);
            } catch (error) {
                lastError = error;
            }
        }

        throw lastError || new Error(`Unable to fetch historical data for ${symbol}`);
    }

    async searchStocks(query) {
        const normalized = query.trim();

        if (!normalized) {
            return [];
        }

        try {
            const payloads = await Promise.all(
                this.getSearchQueries(normalized).map((searchQuery) =>
                    this.fetchJson(`${SEARCH_URL}?q=${encodeURIComponent(searchQuery)}&quotesCount=25&newsCount=0&listsCount=0&enableFuzzyQuery=true`)
                )
            );

            const quotes = payloads.flatMap((payload) => payload.quotes || []);
            const seen = new Set();

            return quotes
                .filter((quote) => {
                    const quoteType = (quote.quoteType || '').toUpperCase();
                    const companyName = `${quote.longname || ''} ${quote.shortname || ''}`.toLowerCase();

                    return (
                        ['NSI', 'BSE'].includes(quote.exchange) ||
                        quote.symbol?.endsWith('.NS') ||
                        quote.symbol?.endsWith('.BO') ||
                        quoteType === 'MUTUALFUND' ||
                        quoteType === 'INDEX' ||
                        companyName.includes('mutual fund') ||
                        companyName.includes('etf') ||
                        companyName.includes('fund')
                    );
                })
                .filter((quote) => {
                    const key = `${quote.symbol}-${quote.exchange || ''}`;
                    if (seen.has(key)) {
                        return false;
                    }

                    seen.add(key);
                    return true;
                })
                .map((quote) => ({
                    symbol: quote.symbol.replace(/\.NS$|\.BO$/i, ''),
                    company_name: quote.longname || quote.shortname || quote.symbol,
                    exchange: quote.exchange || null,
                    type: quote.quoteType || quote.typeDisp || 'EQUITY',
                    category: this.getSearchCategory(quote, normalized),
                    type_label: this.getSearchTypeLabel(quote, normalized),
                }));
        } catch (error) {
            console.error(`Error searching for ${query}:`, error);
            return [];
        }
    }

    getSearchCategory(quote, query = '') {
        const quoteType = (quote.quoteType || '').toUpperCase();
        const companyName = `${quote.longname || ''} ${quote.shortname || ''}`.toLowerCase();
        const normalizedQuery = query.toLowerCase();

        const looksLikeFund = (
            quoteType === 'MUTUALFUND' ||
            quoteType === 'ETF' ||
            companyName.includes('mutual fund') ||
            companyName.includes(' fund') ||
            companyName.includes('etf')
        );

        if (looksLikeFund && normalizedQuery.includes('sip')) {
            return 'sip';
        }

        if (quoteType === 'INDEX') {
            return 'index';
        }

        if (looksLikeFund) {
            return 'mutual_fund';
        }

        return 'stock';
    }

    getSearchTypeLabel(quote, query = '') {
        const category = this.getSearchCategory(quote, query);

        if (category === 'sip') {
            return 'SIP / MF';
        }

        if (category === 'index') {
            return 'INDEX';
        }

        if (category === 'mutual_fund') {
            return 'FUND';
        }

        return 'STOCK';
    }

    async getMultipleQuotes(symbols) {
        const results = await Promise.allSettled(symbols.map((symbol) => this.getQuote(symbol)));

        return results.map((result, index) => ({
            symbol: symbols[index],
            data: result.status === 'fulfilled' ? result.value : null,
            error: result.status === 'rejected' ? result.reason.message : null,
        }));
    }
}

module.exports = new YFinanceService();