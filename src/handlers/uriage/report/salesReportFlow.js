// Lightweight compatibility wrapper for the newer requestFlow/statusActions
// This file preserves the old API (`handleSalesReportButton`, etc.) but
// delegates to the implementations in `requestFlow.js` and `statusActions.js`.

const {
  openUriageReportModal,
  handleUriageReportModalSubmit,
  openUriageEditModal,
} = require('./requestFlow');
const { handleStatusButton } = require('./statusActions');

async function handleSalesReportButton(interaction) {
  return openUriageReportModal(interaction);
}

async function handleSalesReportModal(interaction) {
  return handleUriageReportModalSubmit(interaction);
}

async function handleSalesApproveButton(interaction) {
  return handleStatusButton(interaction);
}

async function handleSalesEditButton(interaction) {
  return openUriageEditModal(interaction);
}

async function handleSalesDeleteButton(interaction) {
  return handleStatusButton(interaction);
}

module.exports = {
  handleSalesReportButton,
  handleSalesReportModal,
  handleSalesApproveButton,
  handleSalesEditButton,
  handleSalesDeleteButton,
};