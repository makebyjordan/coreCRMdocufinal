const docusignService = require('../services/docusign.service');

async function docusignStatus(req, res) {
  res.json({ configured: docusignService.isConfigured() });
}

module.exports = { docusignStatus };
