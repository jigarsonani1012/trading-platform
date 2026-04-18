# Production Environment Config - Frontend Hardcode Removal

## Steps:
- [ ] 1. Update .gitignore to ignore .env files
- [ ] 2. Update frontend/vite.config.ts to proxy /share and /list endpoints
- [ ] 3. Edit frontend/src/components/Watchlist/Watchlist.tsx - add import and replace 2 hardcodes
- [ ] 4. Edit frontend/src/pages/SharedListView.tsx - add import and replace 1 hardcode
- [ ] 5. Edit frontend/src/pages/ListDetailPage.tsx - add import and replace 3 hardcodes
- [ ] 6. Test: cd frontend && npm run dev, check fetches work
- [ ] 7. Test build: npm run build

- [x] 1. Update .gitignore ✅\n- [ ] 2. Update vite.config.ts (N/A - proxy not needed)\n✅ Step 3 in progress: Watchlist.tsx edits
