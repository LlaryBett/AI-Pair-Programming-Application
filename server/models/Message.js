import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  prompt: {
    type: String,
    required: true,
    trim: true
  },
  response: {
    content: {
      type: String,
      required: true
    },
    tokens: {
      type: Number,
      required: true
    }
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // Allows anonymous/unauthenticated requests
  },
  metadata: {
    model: {
      type: String,
      default: "llama3-70b-8192"
    },
    processingTime: Number,
    temperature: {
      type: Number,
      default: 0.7
    }
  },
  isStreamed: {
    type: Boolean,
    default: false
  },
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String
  }
}, { 
  timestamps: true,
  strict: "throw" // Ensures no extra fields are saved
});

// Indexes for faster queries
messageSchema.index({ user: 1 });
messageSchema.index({ createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);
export default Message;