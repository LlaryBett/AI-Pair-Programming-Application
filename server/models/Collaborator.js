import mongoose from 'mongoose';
const { Schema } = mongoose;

const CollaboratorSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  document: { type: Schema.Types.ObjectId, ref: 'Document' },
  role: { type: String, enum: ['owner', 'editor', 'viewer'], required: true },
  joinedAt: { type: Date, default: Date.now }
});

CollaboratorSchema.index({ document: 1, user: 1 }, { unique: true });

export const Collaborator = mongoose.model('Collaborator', CollaboratorSchema);
