const mongoose = require('mongoose');
const { ranks } = require('../utils/enums');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  rank: { type: String, required: true, enum: Object.values(ranks) },
  entryDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);