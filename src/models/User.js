// File: src/models/User.js
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name.'],
  },
  email: {
    type: String,
    required: [true, 'Please provide an email.'],
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password.'],
  },
  role: {
    type: String,
    enum: ['developer', 'cofounder'],
    required: [true, 'Please provide a role.'],
  },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);