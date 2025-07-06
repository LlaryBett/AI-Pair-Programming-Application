import mongoose from "mongoose";
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    firebaseUid: { type: String, unique: true },
    email: { type: String, required: true, unique: true },
    name: { type: String },
    avatarUrl: { type: String },
authMethod: { type: String, enum: ["EMAIL", "GOOGLE", "GITHUB", "PASSWORD"], required: true },

    role: { type: String, default: "user" },
    password: { type: String }, // for local auth
    defaultDocumentId: { type: Schema.Types.ObjectId, ref: 'Document' },
  },
  {
    timestamps: true, // createdAt and updatedAt
  }
);

export const User = mongoose.model("User", userSchema);
