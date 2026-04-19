const express = require('express');
const mongoose = require('mongoose');
const SharedList = require('../models/SharedList');
const StockList = require('../models/StockList');
const { config } = require('../config');
const { nanoid } = require('nanoid');

const router = express.Router();

const generateShareId = () => nanoid(10);

const getFrontendBaseUrl = () => config.frontendUrl;

const ensureDatabaseReady = (res) => {
    if (mongoose.connection.readyState === 1) {
        return true;
    }

    res.status(503).json({ error: 'Share service is unavailable until MongoDB is connected' });
    return false;
};

const expiresAtValue = (_currentExpiresAt, expiresInDays) => {
    const days = Number(expiresInDays);

    if (!Number.isFinite(days) || days <= 0) {
        return null;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    return expiresAt;
};

const mapSavedList = (list) => ({
    id: String(list._id),
    name: list.name,
    symbols: list.symbols,
    userId: list.userId,
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
});

const parseListObjectId = (listId) => {
    if (!mongoose.Types.ObjectId.isValid(listId)) {
        return null;
    }

    return new mongoose.Types.ObjectId(listId);
};

router.get('/lists', async (req, res) => {
    if (!ensureDatabaseReady(res)) {
        return;
    }

    try {
        const userId = String(req.query.userId || 'anonymous').trim();
        const lists = await StockList.find({ userId }).sort({ createdAt: 1 });

        res.json({
            success: true,
            lists: lists.map(mapSavedList),
        });
    } catch (error) {
        console.error('Error fetching saved lists:', error);
        res.status(500).json({ error: 'Failed to fetch saved lists' });
    }
});

router.post('/lists', async (req, res) => {
    if (!ensureDatabaseReady(res)) {
        return;
    }

    try {
        const userId = String(req.body.userId || 'anonymous').trim();
        const name = String(req.body.name || '').trim();

        if (!name) {
            return res.status(400).json({ error: 'List name is required' });
        }

        const existing = await StockList.findOne({ userId, name });
        if (existing) {
            return res.status(409).json({ error: 'A list with this name already exists' });
        }

        const list = await StockList.create({
            userId,
            name,
            symbols: [],
        });

        res.status(201).json({
            success: true,
            list: mapSavedList(list),
        });
    } catch (error) {
        console.error('Error creating saved list:', error);
        res.status(500).json({ error: 'Failed to create saved list' });
    }
});

router.patch('/lists/:listId', async (req, res) => {
    if (!ensureDatabaseReady(res)) {
        return;
    }

    try {
        const { listId } = req.params;
        const userId = String(req.body.userId || 'anonymous').trim();
        const name = String(req.body.name || '').trim();
        const objectId = parseListObjectId(listId);

        if (!name) {
            return res.status(400).json({ error: 'List name is required' });
        }

        if (!objectId) {
            return res.status(400).json({ error: 'Invalid list id' });
        }

        const duplicate = await StockList.findOne({ userId, name, _id: { $ne: objectId } });
        if (duplicate) {
            return res.status(409).json({ error: 'A list with this name already exists' });
        }

        const list = await StockList.findOneAndUpdate(
            { _id: objectId, userId },
            { name, updatedAt: new Date() },
            { new: true }
        );

        if (!list) {
            return res.status(404).json({ error: 'Saved list not found' });
        }

        await SharedList.updateMany(
            { originalListId: String(list._id) },
            { listName: list.name, symbols: list.symbols }
        );

        res.json({
            success: true,
            list: mapSavedList(list),
        });
    } catch (error) {
        console.error('Error updating saved list:', error);
        res.status(500).json({ error: 'Failed to update saved list' });
    }
});

router.post('/lists/:listId/symbols', async (req, res) => {
    if (!ensureDatabaseReady(res)) {
        return;
    }

    try {
        const { listId } = req.params;
        const userId = String(req.body.userId || 'anonymous').trim();
        const symbol = String(req.body.symbol || '').trim().toUpperCase();
        const objectId = parseListObjectId(listId);

        if (!symbol) {
            return res.status(400).json({ error: 'Symbol is required' });
        }

        if (!objectId) {
            return res.status(400).json({ error: 'Invalid list id' });
        }

        const list = await StockList.findOne({ _id: objectId, userId });
        if (!list) {
            return res.status(404).json({ error: 'Saved list not found' });
        }

        if (list.symbols.includes(symbol)) {
            return res.status(409).json({ error: 'Symbol already exists in this list' });
        }

        list.symbols.push(symbol);
        list.updatedAt = new Date();
        await list.save();

        await SharedList.updateMany(
            { originalListId: String(list._id) },
            { listName: list.name, symbols: list.symbols }
        );

        res.json({
            success: true,
            list: mapSavedList(list),
        });
    } catch (error) {
        console.error('Error adding symbol to saved list:', error);
        res.status(500).json({ error: 'Failed to add symbol to saved list' });
    }
});

router.delete('/lists/:listId/symbols/:symbol', async (req, res) => {
    if (!ensureDatabaseReady(res)) {
        return;
    }

    try {
        const { listId, symbol } = req.params;
        const userId = String(req.query.userId || 'anonymous').trim();
        const normalizedSymbol = String(symbol || '').trim().toUpperCase();
        const objectId = parseListObjectId(listId);

        if (!objectId) {
            return res.status(400).json({ error: 'Invalid list id' });
        }

        const list = await StockList.findOne({ _id: objectId, userId });
        if (!list) {
            return res.status(404).json({ error: 'Saved list not found' });
        }

        list.symbols = list.symbols.filter((item) => item !== normalizedSymbol);
        list.updatedAt = new Date();
        await list.save();

        await SharedList.updateMany(
            { originalListId: String(list._id) },
            { listName: list.name, symbols: list.symbols }
        );

        res.json({
            success: true,
            list: mapSavedList(list),
        });
    } catch (error) {
        console.error('Error removing symbol from saved list:', error);
        res.status(500).json({ error: 'Failed to remove symbol from saved list' });
    }
});

router.delete('/lists/:listId', async (req, res) => {
    if (!ensureDatabaseReady(res)) {
        return;
    }

    try {
        const { listId } = req.params;
        const userId = String(req.query.userId || 'anonymous').trim();
        const objectId = parseListObjectId(listId);

        if (!objectId) {
            return res.status(400).json({ error: 'Invalid list id' });
        }

        const deletedList = await StockList.findOneAndDelete({ _id: objectId, userId });
        if (!deletedList) {
            return res.status(404).json({ error: 'Saved list not found' });
        }

        await SharedList.deleteMany({ originalListId: String(deletedList._id) });

        res.json({
            success: true,
            message: 'Saved list deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting saved list:', error);
        res.status(500).json({ error: 'Failed to delete saved list' });
    }
});

router.post('/share', async (req, res) => {
    if (!ensureDatabaseReady(res)) {
        return;
    }

    try {
        const { listName, symbols, userId, expiresInDays, listId } = req.body;
        const normalizedUserId = String(userId || 'anonymous').trim();

        if (!listName || !symbols || symbols.length === 0) {
            return res.status(400).json({ error: 'List name and symbols are required' });
        }

        let sourceList = null;
        if (listId) {
            const objectId = parseListObjectId(listId);
            if (!objectId) {
                return res.status(400).json({ error: 'Invalid list id' });
            }

            sourceList = await StockList.findOne({ _id: objectId, userId: normalizedUserId });
            if (!sourceList) {
                return res.status(404).json({ error: 'Saved list not found' });
            }

            const existing = await SharedList.findOne({ originalListId: listId });
            if (existing && (!existing.expiresAt || existing.expiresAt > new Date())) {
                existing.listName = sourceList.name;
                existing.symbols = sourceList.symbols;
                existing.userId = normalizedUserId;
                existing.expiresAt = expiresAtValue(existing.expiresAt, expiresInDays);
                await existing.save();

                return res.json({
                    success: true,
                    shareId: existing.shareId,
                    shareUrl: `${getFrontendBaseUrl()}/share/${existing.shareId}`,
                    isExisting: true,
                });
            }
        }

        const shareId = generateShareId();
        const expiresAt = expiresAtValue(null, expiresInDays);

        const sharedList = new SharedList({
            shareId,
            userId: normalizedUserId,
            listName: sourceList?.name || listName,
            symbols: sourceList?.symbols || symbols,
            originalListId: listId || null,
            isPublic: true,
            expiresAt,
        });

        await sharedList.save();

        res.json({
            success: true,
            shareId,
            shareUrl: `${getFrontendBaseUrl()}/share/${shareId}`,
            expiresAt,
        });
    } catch (error) {
        console.error('Error creating shared list:', error);
        res.status(500).json({ error: 'Failed to create shared list' });
    }
});

router.get('/share/:shareId', async (req, res) => {
    if (!ensureDatabaseReady(res)) {
        return;
    }

    try {
        const { shareId } = req.params;
        const sharedList = await SharedList.findOne({ shareId });

        if (!sharedList) {
            return res.status(404).json({ error: 'List not found or has expired' });
        }

        if (sharedList.expiresAt && sharedList.expiresAt < new Date()) {
            return res.status(410).json({ error: 'This shared list has expired' });
        }

        sharedList.views += 1;
        await sharedList.save();

        res.json({
            success: true,
            list: {
                shareId: sharedList.shareId,
                listName: sharedList.listName,
                symbols: sharedList.symbols,
                description: sharedList.description,
                createdAt: sharedList.createdAt,
                views: sharedList.views,
            },
        });
    } catch (error) {
        console.error('Error fetching shared list:', error);
        res.status(500).json({ error: 'Failed to fetch shared list' });
    }
});

router.get('/list/:listId', async (req, res) => {
    if (!ensureDatabaseReady(res)) {
        return;
    }

    try {
        const { listId } = req.params;
        const userId = String(req.query.userId || 'anonymous').trim();
        const objectId = parseListObjectId(listId);
        const savedList = objectId ? await StockList.findOne({ _id: objectId, userId }) : null;

        if (savedList) {
            return res.json({
                success: true,
                type: 'local',
                list: mapSavedList(savedList),
            });
        }

        const sharedList = await SharedList.findOne({ shareId: listId });

        if (sharedList) {
            return res.json({
                success: true,
                type: 'shared',
                list: {
                    id: sharedList.shareId,
                    name: sharedList.listName,
                    symbols: sharedList.symbols,
                },
            });
        }

        res.status(404).json({ error: 'List not found' });
    } catch (error) {
        console.error('Error fetching list:', error);
        res.status(500).json({ error: 'Failed to fetch list' });
    }
});

router.delete('/share/:shareId', async (req, res) => {
    if (!ensureDatabaseReady(res)) {
        return;
    }

    try {
        const { shareId } = req.params;
        const deleted = await SharedList.findOneAndDelete({ shareId });
        if (!deleted) {
            return res.status(404).json({ error: 'Shared list not found' });
        }
        res.json({ success: true, message: 'Shared list deleted successfully' });
    } catch (error) {
        console.error('Error deleting shared list:', error);
        res.status(500).json({ error: 'Failed to delete shared list' });
    }
});

module.exports = router;
