import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const documentSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      default: 'Untitled Document'
    },
    code: {
      type: String,
      default: ''
    },
    language: {
      type: String,
      default: 'typescript'
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    lastModified: {
      type: Date,
      default: Date.now
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    collaborators: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        role: {
          type: String,
          enum: ['owner', 'editor', 'viewer'],
          default: 'viewer'
        }
      }
    ],
    isPublic: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// Auto-update `lastModified` when code is changed
documentSchema.pre('save', function (next) {
  if (this.isModified('code')) {
    this.lastModified = new Date();
  }
  next();
});

const Document = model('Document', documentSchema);
export { Document };      // Named export
export default Document;  // Default export
