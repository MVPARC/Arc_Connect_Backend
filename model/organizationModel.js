const mongoose = require('mongoose');

const OrganizationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  domain: { type: String, unique: true, sparse: true },
  address: {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String
  },
  contactEmail: String,
  contactPhone: String,
  subscriptionPlan: {
    type: String,
    enum: ['Free', 'Pro', 'Enterprise'],
    default: 'Free'
  },
  status: {
    type: String,
    enum: ['Active', 'Suspended'],
    default: 'Active'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Organization', OrganizationSchema);
