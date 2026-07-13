// Telemetry Scenarios Preset Data
const SCENARIO_PRESETS = {
    healthy: {
        temp: 48.5,
        vibration: 0.035,
        voltage: 222.0,
        current: 8.5,
        pressure: 2.80
    },
    warning: {
        temp: 78.2,
        vibration: 0.055,
        voltage: 208.0,
        current: 15.2,
        pressure: 4.85
    },
    bearing: {
        temp: 62.0,
        vibration: 0.185,
        voltage: 218.0,
        current: 11.2,
        pressure: 3.20
    },
    overload: {
        temp: 98.5,
        vibration: 0.095,
        voltage: 172.0,
        current: 26.5,
        pressure: 7.10
    }
};

// State Variables
let appMode = 'mock'; // Default, synced with backend status
let serverOnline = false;
let historyLog = [];

// DOM Elements
const modeToggle = document.getElementById('mode-toggle');
const modeValText = document.getElementById('mode-val-text');
const serverStatus = document.getElementById('server-status');
const telemetryForm = document.getElementById('telemetry-form');
const resetBtn = document.getElementById('reset-btn');
const submitBtn = document.getElementById('submit-btn');

// Form inputs
const tempInput = document.getElementById('temp-input');
const tempNum = document.getElementById('temp-num');
const tempValDisplay = document.getElementById('temp-val');

const vibInput = document.getElementById('vib-input');
const vibNum = document.getElementById('vib-num');
const vibValDisplay = document.getElementById('vib-val');

const voltInput = document.getElementById('volt-input');
const voltNum = document.getElementById('volt-num');
const voltValDisplay = document.getElementById('volt-val');

const currInput = document.getElementById('curr-input');
const currNum = document.getElementById('curr-num');
const currValDisplay = document.getElementById('curr-val');

const pressInput = document.getElementById('press-input');
const pressNum = document.getElementById('press-num');
const pressValDisplay = document.getElementById('press-val');

// Preset buttons
const presetButtons = document.querySelectorAll('.preset-btn');

// Diagnostic result state panels
const resultsPrompt = document.getElementById('results-prompt');
const resultsLoading = document.getElementById('results-loading');
const resultsError = document.getElementById('results-error');
const resultsSuccess = document.getElementById('results-success');
const errorMessage = document.getElementById('error-message');
const errorRetryBtn = document.getElementById('error-retry-btn');

// Prediction success sub-components
const classificationBox = document.getElementById('classification-box');
const classificationIcon = document.getElementById('classification-icon');
const predictedClass = document.getElementById('predicted-class');
const alertSubtitle = document.getElementById('alert-subtitle');
const gaugePath = document.getElementById('gauge-path');
const confidenceVal = document.getElementById('confidence-val');
const explanationText = document.getElementById('prediction-explanation');
const sourceBadgeText = document.getElementById('source-badge-text');
const timestampBadgeText = document.getElementById('timestamp-badge-text');

// Probability bars
const probNormalVal = document.getElementById('prob-normal-val');
const probNormalBar = document.getElementById('prob-normal-bar');
const probWarningVal = document.getElementById('prob-warning-val');
const probWarningBar = document.getElementById('prob-warning-bar');
const probCriticalVal = document.getElementById('prob-critical-val');
const probCriticalBar = document.getElementById('prob-critical-bar');

// History log elements
const historyRows = document.getElementById('history-rows');
const clearHistoryBtn = document.getElementById('clear-history-btn');

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Check local storage for history
    loadHistory();
    
    // Sync Range & Number Inputs
    setupInputSync(tempInput, tempNum, tempValDisplay, 1);
    setupInputSync(vibInput, vibNum, vibValDisplay, 3);
    setupInputSync(voltInput, voltNum, voltValDisplay, 0);
    setupInputSync(currInput, currNum, currValDisplay, 1);
    setupInputSync(pressInput, pressNum, pressValDisplay, 2);

    // Setup Scenario Preset Button Clicks
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            presetButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyPreset(btn.dataset.preset);
        });
    });

    // Reset Button Click
    resetBtn.addEventListener('click', () => {
        applyPreset('healthy');
        document.querySelector('.preset-btn[data-preset="healthy"]').click();
    });

    // Form submission
    telemetryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        runDiagnostic();
    });

    // Retry Button Click
    errorRetryBtn.addEventListener('click', runDiagnostic);

    // Clear History Click
    clearHistoryBtn.addEventListener('click', clearHistory);

    // Mode Toggle Switch Change
    modeToggle.addEventListener('change', (e) => {
        appMode = e.target.checked ? 'live' : 'mock';
        modeValText.textContent = e.target.checked ? 'Live Mode' : 'Demo Mode';
        // Add subtle indicator animation when mode changes
        const indicator = document.getElementById('live-indicator');
        indicator.textContent = e.target.checked ? 'IBM WML PREDICTION' : 'DEMO PREDICTION';
    });

    // Query Server Status/Mode Configuration
    checkServerStatus();
});

// Sync two inputs (range and number) and format display
function setupInputSync(rangeEl, numEl, displayEl, decimals) {
    const update = (val) => {
        const parsed = parseFloat(val);
        const formatted = parsed.toFixed(decimals);
        
        rangeEl.value = formatted;
        numEl.value = formatted;
        displayEl.textContent = formatted;
        
        // Remove preset button highlighting since telemetry is customized
        if (event && event.type === 'input') {
            presetButtons.forEach(b => b.classList.remove('active'));
        }
    };

    rangeEl.addEventListener('input', (e) => update(e.target.value));
    numEl.addEventListener('input', (e) => update(e.target.value));
    
    // Set initial formatting
    update(rangeEl.value);
}

// Load preset variables into form
function applyPreset(name) {
    const data = SCENARIO_PRESETS[name];
    if (!data) return;

    // Trigger sync updates
    tempInput.value = data.temp;
    tempInput.dispatchEvent(new Event('input'));

    vibInput.value = data.vibration;
    vibInput.dispatchEvent(new Event('input'));

    voltInput.value = data.voltage;
    voltInput.dispatchEvent(new Event('input'));

    currInput.value = data.current;
    currInput.dispatchEvent(new Event('input'));

    pressInput.value = data.pressure;
    pressInput.dispatchEvent(new Event('input'));
}

// Check if Express backend is running and what configuration mode is enabled
async function checkServerStatus() {
    try {
        const res = await fetch('/api/status');
        if (!res.ok) throw new Error('Status endpoint failure');
        
        const data = await res.json();
        serverOnline = true;
        
        // Update badge
        const dot = serverStatus.querySelector('.status-dot');
        const txt = serverStatus.querySelector('.status-text');
        
        dot.className = 'status-dot success';
        txt.textContent = data.credentialsConfigured ? 'Server Live: WML Connected' : 'Server Live: Demo Mode';
        
        // Enable toggle switch if live credentials are authenticated
        if (data.credentialsConfigured) {
            modeToggle.removeAttribute('disabled');
            modeToggle.checked = true; // Auto enable Live Mode if credentials set
            appMode = 'live';
            modeValText.textContent = 'Live Mode';
            document.getElementById('live-indicator').textContent = 'IBM WML PREDICTION';
        } else {
            modeToggle.setAttribute('disabled', true);
            modeToggle.checked = false;
            appMode = 'mock';
            modeValText.textContent = 'Demo Mode';
            document.getElementById('live-indicator').textContent = 'DEMO PREDICTION';
            
            // Add tiny title explaining why
            modeToggle.parentElement.setAttribute('title', 'Add IBM credentials in your .env file to enable Live Mode');
        }
    } catch (err) {
        console.warn('Backend server connection failed. Visual fallback mode active.', err);
        serverOnline = false;
        
        // Update status badge to show offline fallback
        const dot = serverStatus.querySelector('.status-dot');
        const txt = serverStatus.querySelector('.status-text');
        dot.className = 'status-dot danger';
        txt.textContent = 'Server Offline (Mock Mode)';
        
        modeToggle.setAttribute('disabled', true);
        modeToggle.checked = false;
        appMode = 'mock';
        modeValText.textContent = 'Offline Demo';
    }
    
    // Re-create icons since elements changed
    lucide.createIcons();
}

// Perform diagnosis API call
async function runDiagnostic() {
    // Show Loading Panel
    resultsPrompt.classList.add('hidden');
    resultsError.classList.add('hidden');
    resultsSuccess.classList.add('hidden');
    resultsLoading.classList.remove('hidden');

    const temp = parseFloat(tempInput.value);
    const vibration = parseFloat(vibInput.value);
    const voltage = parseFloat(voltInput.value);
    const current = parseFloat(currInput.value);
    const pressure = parseFloat(pressInput.value);

    // Prepare WML Scoring payload
    // Watson Machine Learning expects an input data schema containing fields and values.
    const payload = {
        input_data: [{
            fields: ['temperature', 'vibration', 'voltage', 'current', 'pressure'],
            values: [[temp, vibration, voltage, current, pressure]]
        }]
    };

    // If server is offline and user runs diagnostic, we can simulate client-side predictions
    if (!serverOnline) {
        simulateClientPrediction(temp, vibration, voltage, current, pressure);
        return;
    }

    try {
        const response = await fetch('/api/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(appMode === 'live' ? payload : { ...payload, mode: 'mock' })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.details || errData.error || 'Prediction service failed.');
        }

        const data = await response.json();
        renderPrediction(data);
        
    } catch (err) {
        console.error('Diagnostic error:', err);
        resultsLoading.classList.add('hidden');
        resultsError.classList.remove('hidden');
        errorMessage.textContent = err.message || 'Connection to telemetry proxy server lost.';
    }
}

// Parse response payload and render state changes
function renderPrediction(data) {
    resultsLoading.classList.add('hidden');
    resultsSuccess.classList.remove('hidden');

    let prediction = 'Unknown';
    let confidence = 100;
    let explanation = '';
    let severity = 'success';
    let probabilities = { normal: 0.95, warning: 0.04, critical: 0.01 };
    
    if (data.mode === 'live' && data.raw) {
        // Parse raw response structure from IBM WML
        // Note: WML structure is: predictions: [{ fields: [...], values: [ [...results] ] }]
        try {
            const predObj = data.raw.predictions[0];
            const fields = predObj.fields;
            const values = predObj.values[0];
            
            // Search field index maps
            const predIdx = fields.findIndex(f => 
                f.toLowerCase().includes('prediction') || 
                f.toLowerCase() === 'class' || 
                f.toLowerCase() === 'label'
            );
            
            const probIdx = fields.findIndex(f => 
                f.toLowerCase().includes('probability') || 
                f.toLowerCase().includes('prob') || 
                f.toLowerCase() === 'confidence'
            );
            
            prediction = predIdx !== -1 ? values[predIdx] : values[0];
            
            if (probIdx !== -1 && Array.isArray(values[probIdx])) {
                const probs = values[probIdx];
                if (probs.length === 3) {
                    probabilities.normal = probs[0];
                    probabilities.warning = probs[1];
                    probabilities.critical = probs[2];
                    confidence = Math.max(...probs) * 100;
                } else {
                    confidence = probs[0] * 100;
                }
            } else if (probIdx !== -1) {
                confidence = values[probIdx] * 100;
            } else {
                confidence = 92.5; // Default if not provided
            }

            // Clean up confidence numbers
            confidence = parseFloat(confidence.toFixed(1));

            // Map class string to color scheme
            const classLower = String(prediction).toLowerCase();
            if (classLower.includes('critical') || classLower.includes('fail') || classLower.includes('danger') || classLower.includes('fault')) {
                severity = 'danger';
                prediction = 'CRITICAL FAULT DETECTED';
            } else if (classLower.includes('warn') || classLower.includes('anomaly') || classLower.includes('strain') || classLower.includes('misalignment')) {
                severity = 'warning';
                prediction = 'WARNING: ANOMALY DETECTED';
            } else {
                severity = 'success';
                prediction = 'NORMAL OPERATION';
            }

            explanation = `Live telemetry analyzed by IBM Cloud WML. Detection indicates status is ${prediction} with ${confidence}% classification confidence.`;

        } catch (parseError) {
            console.error('WML payload parsing exception:', parseError);
            prediction = 'Scoring Completed';
            confidence = 100.0;
            explanation = 'WML executed model calculation successfully, but the output schema was non-standard. Raw output logged in browser console.';
            console.log('Raw output from WML:', data.raw);
        }
    } else {
        // Mock Mode payloads
        prediction = data.prediction;
        confidence = data.confidence;
        explanation = data.explanation;
        severity = data.severity;
        probabilities = data.probabilities;
    }

    // Apply values to UI
    predictedClass.textContent = prediction;
    confidenceVal.textContent = `${confidence}%`;
    explanationText.textContent = explanation;
    sourceBadgeText.textContent = data.mode === 'live' ? 'IBM Cloud WML (Live)' : 'Diagnostic Engine (Mock)';
    
    // Format timestamp
    const date = new Date(data.timestamp);
    timestampBadgeText.textContent = date.toLocaleTimeString();

    // 1. Update Alert Box styling
    classificationBox.className = `alert-box ${severity}`;
    
    // 2. Update Alert Icons
    let iconName = 'check-circle';
    let subtitleText = 'Telemetry indices are nominal';
    if (severity === 'warning') {
        iconName = 'alert-triangle';
        subtitleText = 'System performance degradation detected';
    } else if (severity === 'danger') {
        iconName = 'skull';
        subtitleText = 'Critical operating tolerances exceeded';
    }
    classificationIcon.setAttribute('data-lucide', iconName);

    // 3. Render Circular Gauge Path
    // Radius = 40, Perimeter = 2 * PI * r = ~251.2
    const perimeter = 251.2;
    const offset = perimeter - (perimeter * (confidence / 100));
    gaugePath.style.strokeDashoffset = offset;
    gaugePath.className = `gauge-fill ${severity === 'success' ? 'healthy' : severity}`;

    // 4. Update Probability distribution bars
    const pNormal = Math.round(probabilities.normal * 100);
    const pWarning = Math.round(probabilities.warning * 100);
    const pCritical = Math.round(probabilities.critical * 100);

    probNormalVal.textContent = `${pNormal}%`;
    probNormalBar.style.width = `${pNormal}%`;
    
    probWarningVal.textContent = `${pWarning}%`;
    probWarningBar.style.width = `${pWarning}%`;

    probCriticalVal.textContent = `${pCritical}%`;
    probCriticalBar.style.width = `${pCritical}%`;

    // 5. Append to history list
    const inputs = data.inputs || {
        temperature: parseFloat(tempInput.value),
        vibration: parseFloat(vibInput.value),
        voltage: parseFloat(voltInput.value),
        current: parseFloat(currInput.value),
        pressure: parseFloat(pressInput.value)
    };

    saveRunToHistory({
        prediction: prediction,
        severity: severity,
        confidence: confidence,
        inputs: inputs,
        timestamp: data.timestamp
    });

    // Re-render icons
    lucide.createIcons();
}

// Fallback simulator if node backend isn't responding
function simulateClientPrediction(temp, vibration, voltage, current, pressure) {
    setTimeout(() => {
        // Run identical algorithm locally for client experience
        let classification = 'Normal Operation';
        let severity = 'success';
        let confidence = 0.96;
        let explanation = 'All telemetry signals are within optimal operating thresholds. No signs of stress or deterioration.';
        let probabilities = { normal: 0.96, warning: 0.03, critical: 0.01 };

        if (temp > 85 || vibration > 0.12 || voltage < 185 || voltage > 255 || current > 20 || pressure > 6.5) {
            classification = 'Critical Fault Detected';
            severity = 'danger';
            confidence = 0.89 + Math.random() * 0.08;
            
            const issues = [];
            if (temp > 85) issues.push(`Overheat (${temp}°C)`);
            if (vibration > 0.12) issues.push(`Excessive vibrations (${vibration} g)`);
            if (voltage < 185 || voltage > 255) issues.push(`Voltage out of spec (${voltage} V)`);
            if (current > 20) issues.push(`Electrical overload (${current} A)`);
            if (pressure > 6.5) issues.push(`Pressure leak (${pressure} bar)`);
            
            explanation = `CRITICAL ALERT: System operates in failure zone: ${issues.join(', ')}. Emergency diagnostics recommended.`;
            
            probabilities = {
                normal: (1 - confidence) * 0.1,
                warning: (1 - confidence) * 0.9,
                critical: confidence
            };
        } else if (temp > 75 || vibration > 0.08 || voltage < 200 || voltage > 240 || current > 15 || pressure > 5.0) {
            classification = 'Warning: Anomaly Detected';
            severity = 'warning';
            confidence = 0.76 + Math.random() * 0.12;

            const issues = [];
            if (temp > 75) issues.push('Thermal strain');
            if (vibration > 0.08) issues.push('Misalignment vibration');
            if (voltage < 200 || voltage > 240) issues.push('Line fluctuation');
            if (current > 15) issues.push('High current load');
            if (pressure > 5.0) issues.push('Elevated pressure');

            explanation = `WARNING: Telemetry flags caution indices: ${issues.join(', ')}. Schedule manual equipment check.`;

            probabilities = {
                normal: (1 - confidence) * 0.6,
                warning: confidence,
                critical: (1 - confidence) * 0.4
            };
        }

        const totalProb = probabilities.normal + probabilities.warning + probabilities.critical;
        probabilities.normal = parseFloat((probabilities.normal / totalProb).toFixed(4));
        probabilities.warning = parseFloat((probabilities.warning / totalProb).toFixed(4));
        probabilities.critical = parseFloat((probabilities.critical / totalProb).toFixed(4));

        renderPrediction({
            mode: 'mock',
            timestamp: new Date().toISOString(),
            prediction: classification,
            severity: severity,
            confidence: parseFloat((confidence * 100).toFixed(2)),
            explanation: explanation,
            probabilities: probabilities,
            inputs: { temperature: temp, vibration: vibration, voltage: voltage, current: current, pressure: pressure }
        });
    }, 450);
}

// Save running logs inside localStorage
function saveRunToHistory(item) {
    historyLog.unshift(item);
    
    // Caps log items to 10
    if (historyLog.length > 10) {
        historyLog.pop();
    }
    
    localStorage.setItem('sentinel_ml_history', JSON.stringify(historyLog));
    renderHistoryRows();
}

function loadHistory() {
    const saved = localStorage.getItem('sentinel_ml_history');
    if (saved) {
        try {
            historyLog = JSON.parse(saved);
            renderHistoryRows();
        } catch (e) {
            console.error('History restoration failed', e);
            historyLog = [];
        }
    }
}

// Render historical run rows dynamically
function renderHistoryRows() {
    if (historyLog.length === 0) {
        historyRows.innerHTML = `
            <tr class="empty-state-row">
                <td colspan="5" class="empty-history-cell">
                    <i data-lucide="database-backup"></i>
                    <p>No historical runs logged yet.</p>
                </td>
            </tr>
        `;
        lucide.createIcons();
        return;
    }

    historyRows.innerHTML = '';
    
    historyLog.forEach((item, index) => {
        const tr = document.createElement('tr');
        
        let label = 'Healthy';
        let badgeClass = 'healthy';
        if (item.severity === 'warning') {
            label = 'Warning';
            badgeClass = 'warning';
        } else if (item.severity === 'danger') {
            label = 'Fault';
            badgeClass = 'danger';
        }

        // Format short telemetry stats string
        const t = item.inputs.temperature.toFixed(1);
        const v = item.inputs.vibration.toFixed(3);
        const volt = item.inputs.voltage.toFixed(0);
        const c = item.inputs.current.toFixed(1);
        const p = item.inputs.pressure.toFixed(2);
        const telemetrySummary = `${t}°C | ${v}g | ${volt}V | ${c}A | ${p}bar`;

        const time = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        tr.innerHTML = `
            <td><span class="history-badge ${badgeClass}">${label}</span></td>
            <td><strong>${item.confidence}%</strong></td>
            <td class="history-inputs">${telemetrySummary}</td>
            <td class="history-time">${time}</td>
            <td>
                <button class="btn-row-action" onclick="loadHistoryItem(${index})">
                    <i data-lucide="corner-down-left"></i> Restore
                </button>
            </td>
        `;
        
        historyRows.appendChild(tr);
    });

    lucide.createIcons();
}

// Restore parameters from historical runs
window.loadHistoryItem = function(index) {
    const item = historyLog[index];
    if (!item) return;

    // Apply values
    tempInput.value = item.inputs.temperature;
    tempInput.dispatchEvent(new Event('input'));
    
    vibInput.value = item.inputs.vibration;
    vibInput.dispatchEvent(new Event('input'));
    
    voltInput.value = item.inputs.voltage;
    voltInput.dispatchEvent(new Event('input'));
    
    currInput.value = item.inputs.current;
    currInput.dispatchEvent(new Event('input'));
    
    pressInput.value = item.inputs.pressure;
    pressInput.dispatchEvent(new Event('input'));

    // Highlight form elements with temporary pulse animation
    const fields = [tempInput, vibInput, voltInput, currInput, pressInput];
    fields.forEach(el => {
        const parent = el.closest('.form-group');
        parent.style.boxShadow = '0 0 10px var(--color-primary-glow)';
        parent.style.borderColor = 'rgba(0, 240, 255, 0.4)';
        setTimeout(() => {
            parent.style.boxShadow = 'none';
            parent.style.borderColor = 'transparent';
        }, 1000);
    });

    // Reset scenarios styling
    presetButtons.forEach(b => b.classList.remove('active'));
};

// Clear run history
function clearHistory() {
    if (confirm('Are you sure you want to clear the diagnostic history log?')) {
        historyLog = [];
        localStorage.removeItem('sentinel_ml_history');
        renderHistoryRows();
    }
}
