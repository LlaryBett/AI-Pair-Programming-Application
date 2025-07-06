import mongoose from "mongoose";

const invitationSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    invitedEmail: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["viewer", "editor"],
      default: "editor",
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "cancelled"], // Added 'cancelled'
      default: "pending",
    },
    acceptedAt: Date,
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  },
  {
    timestamps: true,
  }
);

export const Invitation = mongoose.model("Invitation", invitationSchema);
