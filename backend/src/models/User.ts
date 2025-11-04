import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password_hash: string;
  role: 'operator' | 'supervisor' | 'admin' | 'analyst';
  permissions: string[];
  stations: string[];
  two_factor_enabled: boolean;
  two_factor_method: 'sms' | 'authenticator' | 'email' | null;
  two_factor_secret: string | null;
  phone_number: string | null;
  backup_codes: string[];
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

const userSchema = new Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password_hash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['operator', 'supervisor', 'admin', 'analyst'],
    required: true,
    default: 'operator',
  },
  permissions: {
    type: [String],
    default: [],
  },
  stations: {
    type: [String],
    default: [],
  },
  two_factor_enabled: {
    type: Boolean,
    default: false,
  },
  two_factor_method: {
    type: String,
    enum: ['sms', 'authenticator', 'email', null],
    default: null,
  },
  two_factor_secret: {
    type: String,
    default: null,
  },
  phone_number: {
    type: String,
    default: null,
  },
  backup_codes: {
    type: [String],
    default: [],
  },
  active: {
    type: Boolean,
    default: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

// Indexes
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

export const User = mongoose.model<IUser>('User', userSchema);













