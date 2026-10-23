const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = [
  'citizen',
  'eoc', 
  'rescue_team',
  'hospital',
  'shelter',
  'volunteer',
  'ngo',
  'admin',
];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ROLES, default: 'citizen', required: true },

    
    organizationName: { type: String, trim: true },

    
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },

    phone: { type: String, trim: true },

    
    safetyStatus: {
      type: String,
      enum: ['unknown', 'safe', 'needs_help'],
      default: 'unknown',
    },

    


    verificationDocument: {
      dataUrl: { type: String, default: null }, 
      fileName: { type: String, default: '' },
      status: { type: String, enum: ['not_submitted', 'pending', 'approved', 'rejected'], default: 'not_submitted' },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      reviewNote: { type: String, default: '' },
      uploadedAt: { type: Date },
      reviewedAt: { type: Date },
    },
    

    refreshTokenHash: { type: String, select: false },
  },
  { timestamps: true }
);

userSchema.index({ location: '2dsphere' });


userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});


userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};


userSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokenHash;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
