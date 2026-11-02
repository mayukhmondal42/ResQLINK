const mongoose = require('mongoose');

const facilitySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['shelter', 'hospital'], required: true },
    name: { type: String, required: true, trim: true },

    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, 
      address: { type: String, trim: true },
    },

    
    capacityTotal: { type: Number, default: 0 },
    capacityUsed: { type: Number, default: 0 },

    
    resources: [{ type: String }], 

    contactPhone: { type: String, trim: true },
    managedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    status: {
      type: String,
      enum: ['operational', 'full', 'closed'],
      default: 'operational',
    },

    isDemoData: { type: Boolean, default: false },
  },
  { timestamps: true }
);

facilitySchema.index({ location: '2dsphere' });


facilitySchema.virtual('occupancyPercent').get(function occupancyPercent() {
  if (!this.capacityTotal) return 0;
  return Math.round((this.capacityUsed / this.capacityTotal) * 100);
});
facilitySchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Facility', facilitySchema);
