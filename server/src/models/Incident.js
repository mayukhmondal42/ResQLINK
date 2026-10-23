const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['sos', 'incident_report', 'missing_person', 'resource_request'],
      default: 'incident_report',
    },

    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },

    
    category: {
      type: String,
      enum: ['flood', 'fire', 'earthquake', 'medical', 'structural', 'other'],
      default: 'other',
    },

    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },

    status: {
      type: String,
      enum: ['reported', 'acknowledged', 'dispatched', 'in_progress', 'resolved', 'merged', 'rejected'],
      default: 'reported',
    },

    

    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, 
      address: { type: String, trim: true },
    },

    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    
    aiAnalysis: {
      summary: { type: String, default: '' },
      suggestedSeverity: { type: String, default: '' },
      suggestedCategory: { type: String, default: '' },
      suggestedResources: [{ type: String }], 
      recommendedResources: [{ name: String, qty: Number }], 
      etaMinutes: { type: Number, default: null },
      confidence: { type: Number, default: 50 }, 
      generatedAt: { type: Date },
      source: { type: String, enum: ['gemini', 'mock', 'none'], default: 'none' },
    },

    


    reporterLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: null },
    },

    crowdVotes: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        vote: { type: String, enum: ['confirm', 'dispute'] },
        at: { type: Date, default: Date.now },
      },
    ],

    authorityVerification: {
      status: { type: String, enum: ['pending', 'confirmed', 'rejected'], default: 'pending' },
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      note: { type: String, default: '' },
      at: { type: Date },
    },

    verification: {
      gpsScore: { type: Number, default: 50 },
      crowdScore: { type: Number, default: 50 },
      authorityScore: { type: Number, default: 40 },
      aiScore: { type: Number, default: 50 },
      trustScore: { type: Number, default: 45 },
      trustState: {
        type: String,
        enum: ['pending', 'suspicious', 'verified', 'highly_trusted'],
        default: 'pending',
      },
    },

    


    escalated: { type: Boolean, default: false },
    


    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', default: null },

    imageUrl: { type: String, default: '' },

    
    timeline: [
      {
        status: String,
        note: String,
        actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
      },
    ],

    

    
    isDemoData: { type: Boolean, default: false },
  },
  { timestamps: true }
);

incidentSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Incident', incidentSchema);
