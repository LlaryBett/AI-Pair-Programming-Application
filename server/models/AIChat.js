import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['user', 'ai', 'system'],
    index: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  metadata: {
    tokens: Number,
    processingTime: Number,
    apiResponse: mongoose.Schema.Types.Mixed
  },
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    updatedAt: Date
  }
}, { _id: false });

const aiChatSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true
  },
  messages: [messageSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Auto-update timestamps
aiChatSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Compound index for faster queries
aiChatSchema.index({ documentId: 1, 'messages.id': 1 });
aiChatSchema.index({ documentId: 1, 'messages.timestamp': -1 });

export default mongoose.model('AIChat', aiChatSchema);