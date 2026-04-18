const mongoose = require('mongoose');

const sharedListSchema = new mongoose.Schema({
    shareId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    originalListId: {
        type: String,
        default: null,
    },
    userId: {
        type: String,
        default: 'anonymous',
    },
    listName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50,
    },
    symbols: [{
        type: String,
        uppercase: true,
        trim: true,
    }],
    isPublic: {
        type: Boolean,
        default: true,
    },
    description: {
        type: String,
        maxlength: 200,
        default: '',
    },
    views: {
        type: Number,
        default: 0,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    expiresAt: {
        type: Date,
        default: null,
    },
});

sharedListSchema.index({ shareId: 1 });
sharedListSchema.index({ createdAt: -1 });
sharedListSchema.index({ originalListId: 1 });

module.exports = mongoose.model('SharedList', sharedListSchema);