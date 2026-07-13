const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Helper to check if credentials are configured
function hasValidCredentials() {
  const key = process.env.IBM_CLOUD_API_KEY;
  const url = process.env.WML_SCORING_URL;
  return key && key !== 'your_ibm_cloud_api_key_here' && url && url !== '';
}

// Endpoint to check connection status / configuration
app.get('/api/status', (req, res) => {
  const configured = hasValidCredentials();
  res.json({
    status: 'online',
    mode: configured ? 'live' : 'mock',
    credentialsConfigured: configured,
    message: configured 
      ? 'Connected to server: WML credentials configured. Live mode ready.' 
      : 'Connected to server: Running in Demo/Mock Mode. Add your API credentials to .env for Live Mode.'
  });
});

// Main Predict endpoint (secure proxy to Watson Machine Learning)
app.post('/api/predict', async (req, res) => {
  const { input_data } = req.body;

  if (!input_data || !input_data.fields || !input_data.values || !input_data.values[0]) {
    return res.status(400).json({ 
      error: 'Invalid request payload. Must match WML structure with "fields" and "values".' 
    });
  }

  // Fallback to Mock predictor if credentials aren't configured
  if (!hasValidCredentials()) {
    const fields = input_data.fields;
    const values = input_data.values[0];
    
    // Map fields to values
    const data = {};
    fields.forEach((f, i) => {
      data[f.toLowerCase()] = values[i];
    });

    // Run custom mock detection logic
    const temp = parseFloat(data.temperature || data.temp || 50);
    const vibration = parseFloat(data.vibration || data.vib || 0.04);
    const voltage = parseFloat(data.voltage || data.volt || 220);
    const current = parseFloat(data.current || 10);
    const pressure = parseFloat(data.pressure || data.press || 3);

    let classification = 'Normal Operation';
    let severity = 'success';
    let confidence = 0.95;
    let explanation = 'All telemetry signals are within optimal operating thresholds. No signs of stress or deterioration.';
    let probabilities = { normal: 0.95, warning: 0.04, critical: 0.01 };

    // Threshold classification
    if (temp > 85 || vibration > 0.12 || voltage < 185 || voltage > 255 || current > 20 || pressure > 6.5) {
      classification = 'Critical Fault Detected';
      severity = 'danger';
      confidence = 0.88 + Math.random() * 0.1;
      
      const issues = [];
      if (temp > 85) issues.push(`Overheating condition (${temp}°C)`);
      if (vibration > 0.12) issues.push(`Excessive mechanical vibration (${vibration} g)`);
      if (voltage < 185 || voltage > 255) issues.push(`Voltage out of safe tolerance (${voltage} V)`);
      if (current > 20) issues.push(`Electrical overcurrent (${current} A)`);
      if (pressure > 6.5) issues.push(`High line pressure (${pressure} bar)`);
      
      explanation = `CRITICAL ALERT: System is showing signs of immediate failure: ${issues.join(', ')}. Shut down procedures recommended to avoid equipment damage.`;
      
      probabilities = {
        normal: (1 - confidence) * 0.1,
        warning: (1 - confidence) * 0.9,
        critical: confidence
      };
    } else if (temp > 75 || vibration > 0.08 || voltage < 200 || voltage > 240 || current > 15 || pressure > 5.0) {
      classification = 'Warning: Anomaly Detected';
      severity = 'warning';
      confidence = 0.75 + Math.random() * 0.15;

      const issues = [];
      if (temp > 75) issues.push('Thermal strain');
      if (vibration > 0.08) issues.push('Minor axis misalignment');
      if (voltage < 200 || voltage > 240) issues.push('Slight line fluctuation');
      if (current > 15) issues.push('Elevated motor load');
      if (pressure > 5.0) issues.push('Elevated reservoir pressure');

      explanation = `WARNING: Telemetry indicates minor deviation from normal: ${issues.join(', ')}. Schedule inspection soon.`;

      probabilities = {
        normal: (1 - confidence) * 0.6,
        warning: confidence,
        critical: (1 - confidence) * 0.4
      };
    }

    // Normalize probabilities to sum to 1
    const totalProb = probabilities.normal + probabilities.warning + probabilities.critical;
    probabilities.normal = parseFloat((probabilities.normal / totalProb).toFixed(4));
    probabilities.warning = parseFloat((probabilities.warning / totalProb).toFixed(4));
    probabilities.critical = parseFloat((probabilities.critical / totalProb).toFixed(4));

    // Wait 400ms to simulate network latency
    await new Promise(resolve => setTimeout(resolve, 400));

    return res.json({
      mode: 'mock',
      timestamp: new Date().toISOString(),
      prediction: classification,
      severity: severity,
      confidence: parseFloat((confidence * 100).toFixed(2)),
      explanation: explanation,
      probabilities: probabilities,
      inputs: data
    });
  }

  // --- Live Mode: Query Watson Machine Learning ---
  try {
    const apiKey = process.env.IBM_CLOUD_API_KEY;
    const scoringUrl = process.env.WML_SCORING_URL;

    // Step 1: Obtain IBM Cloud IAM Access Token
    const iamResponse = await fetch('https://iam.cloud.ibm.com/identity/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
        apikey: apiKey
      })
    });

    if (!iamResponse.ok) {
      const errText = await iamResponse.text();
      throw new Error(`IBM IAM Token generation failed: ${iamResponse.statusText}. Details: ${errText}`);
    }

    const tokenData = await iamResponse.json();
    const accessToken = tokenData.access_token;

    // Step 2: Scoring request to Watson Machine Learning endpoint
    const wmlResponse = await fetch(scoringUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    if (!wmlResponse.ok) {
      const errText = await wmlResponse.text();
      throw new Error(`WML scoring failed with status ${wmlResponse.status}: ${errText}`);
    }

    const wmlResult = await wmlResponse.json();

    // Step 3: Parse and format predictions back to frontend
    // Standard WML deployment prediction result contains an array:
    // predictions: [{ fields: [...], values: [ [...results] ] }]
    // We pass the raw result or format it cleanly
    res.json({
      mode: 'live',
      timestamp: new Date().toISOString(),
      raw: wmlResult
    });

  } catch (error) {
    console.error('IBM Cloud Prediction Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to retrieve prediction from IBM Cloud WML service.', 
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
});
