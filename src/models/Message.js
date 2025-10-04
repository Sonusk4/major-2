import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  mentorship: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentorship', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  editedAt: { type: Date },
  deletedAt: { type: Date }
}, { timestamps: true });

MessageSchema.index({ mentorship: 1, createdAt: 1 });

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);


