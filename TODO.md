# Chart Data & UI Fix Plan

## Steps:
1. [x] Add default symbol 'AAPL' to DEFAULT_LIST in frontend/src/hooks/useStockData.ts → auto-populate watchlist
2. [x] Update InlineChart.tsx: flex height, skeleton loader, retry button on error
3. [x] Update ChartModal.tsx: skeleton, retry, responsive
4. [x] Update StockChartWrapper.tsx: better loading/no-data states
5. [x] Update TradingViewLayout.tsx & ChartView.tsx: better placeholders
6. [x] Test: Refresh app, verify AAPL chart loads with proper UI
7. [x] Mark complete

**All steps completed!**

Charts now:
- Load AAPL by default in watchlist
- InlineChart/ChartModal have skeleton loaders, error retry, responsive heights
- Proper loading states everywhere
- Backend data flow fixed for display

Run `npm run dev` in frontend/ to see AAPL StockCard with toggleable inline chart + modal.


