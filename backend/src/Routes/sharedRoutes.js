const express = require('express');
const router = express.Router();
const SharedList = require('../models/SharedList');
const { nanoid } = require('nanoid');

const generateShareId = () => {
    return nanoid(10);
};

// CREATE shared list
router.post('/share', async (req, res) => {
    try {
        const { listName, symbols, userId, expiresInDays, listId } = req.body;

        if (!listName || !symbols || symbols.length === 0) {
            return res.status(400).json({ error: 'List name and symbols are required' });
        }

        if (listId) {
            const existing = await SharedList.findOne({ originalListId: listId });
            if (existing && (!existing.expiresAt || existing.expiresAt > new Date())) {
                return res.json({
                    success: true,
                    shareId: existing.shareId,
                    shareUrl: `${process.env.FRONTEND_URL}/share/${existing.shareId}`,
                    isExisting: true,
                });
            }
        }

        const shareId = generateShareId();
        
        let expiresAt = null;
        if (expiresInDays && expiresInDays > 0) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + expiresInDays);
        }

        const sharedList = new SharedList({
            shareId,
            userId: userId || 'anonymous',
            listName,
            symbols,
            originalListId: listId || null,
            isPublic: true,
            expiresAt,
        });

        await sharedList.save();

        res.json({
            success: true,
            shareId,
            shareUrl: `${process.env.FRONTEND_URL}/share/${shareId}`,
            expiresAt,
        });
    } catch (error) {
        console.error('Error creating shared list:', error);
        res.status(500).json({ error: 'Failed to create shared list' });
    }
});

// GET shared list by ID
router.get('/share/:shareId', async (req, res) => {
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

// GET list by ID
router.get('/list/:listId', async (req, res) => {
    try {
        const { listId } = req.params;
        
        let sharedList = await SharedList.findOne({ shareId: listId });
        
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

// DELETE shared list
router.delete('/share/:shareId', async (req, res) => {
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