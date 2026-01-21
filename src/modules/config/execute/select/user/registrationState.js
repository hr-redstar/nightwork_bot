const crypto = require('crypto');

const registrationStates = new Map();

function createRegistrationState(initial = {}) {
  const stateId = `userreg_${crypto.randomBytes(6).toString('hex')}`;
  registrationStates.set(stateId, { ...initial, createdAt: Date.now() });
  return stateId;
}

function getRegistrationState(stateId) {
  if (!stateId) return null;
  return registrationStates.get(stateId) || null;
}

function updateRegistrationState(stateId, patch = {}) {
  if (!stateId) return null;
  const current = registrationStates.get(stateId) || {};
  const updated = { ...current, ...patch, updatedAt: Date.now() };
  registrationStates.set(stateId, updated);
  return updated;
}

function deleteRegistrationState(stateId) {
  if (!stateId) return;
  registrationStates.delete(stateId);
}

module.exports = {
  createRegistrationState,
  getRegistrationState,
  updateRegistrationState,
  deleteRegistrationState,
};
