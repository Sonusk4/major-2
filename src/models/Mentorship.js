import mongoose from 'mongoose';

const MentorshipSchema = new mongoose.Schema({
  mentee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'declined', 'cancelled'], default: 'pending' },
  message: { type: String },
  respondedAt: { type: Date },
}, { timestamps: true });

MentorshipSchema.index({ mentee: 1, mentor: 1, status: 1 });

export default mongoose.models.Mentorship || mongoose.model('Mentorship', MentorshipSchema);


