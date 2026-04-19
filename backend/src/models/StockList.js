const mongoose = require('mongoose');

const stockListSchema = new mongoose.Schema({
    userId: {
        type: String,
        default: 'anonymous',
        index: true,
    },
    name: {
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
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    versionKey: false,
});

stockListSchema.index({ userId: 1, name: 1 }, { unique: true });

stockListSchema.pre('save', function updateTimestamp() {
    this.updatedAt = new Date();
});

module.exports = mongoose.model('StockList', stockListSchema);
