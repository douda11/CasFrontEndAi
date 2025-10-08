const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors());

// Serve the contracts.json file
app.get('/contracts.json', (req, res) => {
  const contractsPath = path.join('C:', 'Users', 'OMAR INFO', 'Downloads', 'comparateur_brokins-master', 'contracts.json');
  
  console.log(`📋 Serving contracts.json from: ${contractsPath}`);
  
  if (fs.existsSync(contractsPath)) {
    res.sendFile(contractsPath);
  } else {
    console.error(`❌ File not found: ${contractsPath}`);
    res.status(404).json({ error: 'Contracts file not found' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Contracts server is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Contracts server running on http://localhost:${PORT}`);
  console.log(`📋 Contracts available at: http://localhost:${PORT}/contracts.json`);
});
