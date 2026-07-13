import os
import sys
import json
import urllib.request
import urllib.parse
import http.server
import socketserver
import time
from datetime import datetime

# Load environment variables from .env manually to prevent extra dependencies
def load_env():
    if os.path.exists('.env'):
        with open('.env', 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    parts = line.split('=', 1)
                    if len(parts) == 2:
                        os.environ[parts[0].strip()] = parts[1].strip()

load_env()

PORT = int(os.environ.get('PORT', 3000))

def has_valid_credentials():
    key = os.environ.get('IBM_CLOUD_API_KEY')
    url = os.environ.get('WML_SCORING_URL')
    return bool(key and key != 'your_ibm_cloud_api_key_here' and url and url != '')

class ProxyHTTPRequestHandler(http.server.BaseHTTPRequestHandler):
    def end_headers(self):
        # Allow CORS for development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/status':
            self.handle_status()
        else:
            self.serve_static()

    def do_POST(self):
        if self.path == '/api/predict':
            self.handle_predict()
        else:
            self.send_response(404)
            self.end_headers()

    def handle_status(self):
        configured = has_valid_credentials()
        response_data = {
            'status': 'online',
            'mode': 'live' if configured else 'mock',
            'credentialsConfigured': configured,
            'message': 'Connected to Python Server: WML credentials configured. Live mode ready.' if configured 
                      else 'Connected to Python Server: Running in Demo/Mock Mode. Add your API credentials to .env for Live Mode.'
        }
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(response_data).encode('utf-8'))

    def serve_static(self):
        # Default route to index.html
        path = self.path
        if path == '/' or path == '':
            path = '/index.html'
        
        # Clean query strings if any
        path = path.split('?')[0]

        # Map to public directory
        filepath = os.path.join(os.getcwd(), 'public', path.lstrip('/'))
        
        # Security check (ensure it's inside the workspace/public folder)
        public_dir = os.path.abspath(os.path.join(os.getcwd(), 'public'))
        abs_filepath = os.path.abspath(filepath)
        
        if not abs_filepath.startswith(public_dir) or not os.path.exists(abs_filepath) or os.path.isdir(abs_filepath):
            self.send_response(404)
            self.end_headers()
            return

        # Determine MIME type
        content_type = 'text/plain'
        if filepath.endswith('.html'):
            content_type = 'text/html'
        elif filepath.endswith('.css'):
            content_type = 'text/css'
        elif filepath.endswith('.js'):
            content_type = 'text/javascript'
        elif filepath.endswith('.png'):
            content_type = 'image/png'
        elif filepath.endswith('.ico'):
            content_type = 'image/x-icon'

        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.end_headers()
        
        with open(abs_filepath, 'rb') as f:
            self.wfile.write(f.read())

    def handle_predict(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            req_data = json.loads(post_data.decode('utf-8'))
        except Exception:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Invalid JSON'}).encode('utf-8'))
            return

        input_data = req_data.get('input_data')
        if not input_data or 'fields' not in input_data[0] or 'values' not in input_data[0]:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Invalid payload. Must match WML format.'}).encode('utf-8'))
            return

        if not has_valid_credentials():
            # Mock Predictor fallback
            fields = input_data[0]['fields']
            values = input_data[0]['values'][0]
            
            data = {}
            for i, f in enumerate(fields):
                data[f.lower()] = values[i]

            temp = float(data.get('temperature', data.get('temp', 50)))
            vibration = float(data.get('vibration', data.get('vib', 0.04)))
            voltage = float(data.get('voltage', data.get('volt', 220)))
            current = float(data.get('current', 10))
            pressure = float(data.get('pressure', data.get('press', 3)))

            classification = 'Normal Operation'
            severity = 'success'
            confidence = 0.95
            explanation = 'All telemetry signals are within optimal operating thresholds. No signs of stress or deterioration.'
            probabilities = {'normal': 0.95, 'warning': 0.04, 'critical': 0.01}

            if temp > 85 or vibration > 0.12 or voltage < 185 or voltage > 255 or current > 20 or pressure > 6.5:
                classification = 'Critical Fault Detected'
                severity = 'danger'
                confidence = 0.88 + (hash(str(temp)) % 10) / 100.0  # semi-stable pseudo-random
                
                issues = []
                if temp > 85: issues.append(f"Overheating condition ({temp}°C)")
                if vibration > 0.12: issues.append(f"Excessive mechanical vibration ({vibration} g)")
                if voltage < 185 or voltage > 255: issues.append(f"Voltage out of safe tolerance ({voltage} V)")
                if current > 20: issues.append(f"Electrical overcurrent ({current} A)")
                if pressure > 6.5: issues.append(f"High line pressure ({pressure} bar)")
                
                explanation = f"CRITICAL ALERT: System is showing signs of immediate failure: {', '.join(issues)}. Shut down procedures recommended to avoid equipment damage."
                
                probabilities = {
                    'normal': (1 - confidence) * 0.1,
                    'warning': (1 - confidence) * 0.9,
                    'critical': confidence
                }
            elif temp > 75 or vibration > 0.08 or voltage < 200 or voltage > 240 or current > 15 or pressure > 5.0:
                classification = 'Warning: Anomaly Detected'
                severity = 'warning'
                confidence = 0.75 + (hash(str(temp)) % 15) / 100.0

                issues = []
                if temp > 75: issues.append('Thermal strain')
                if vibration > 0.08: issues.append('Minor axis misalignment')
                if voltage < 200 or voltage > 240: issues.append('Slight line fluctuation')
                if current > 15: issues.append('Elevated motor load')
                if pressure > 5.0: issues.append('Elevated reservoir pressure')

                explanation = f"WARNING: Telemetry indicates minor deviation from normal: {', '.join(issues)}. Schedule inspection soon."

                probabilities = {
                    'normal': (1 - confidence) * 0.6,
                    'warning': confidence,
                    'critical': (1 - confidence) * 0.4
                }

            total_prob = sum(probabilities.values())
            probabilities = {k: round(v / total_prob, 4) for k, v in probabilities.items()}

            time.sleep(0.4) # Simulate latency

            response_payload = {
                'mode': 'mock',
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'prediction': classification,
                'severity': severity,
                'confidence': round(confidence * 100, 2),
                'explanation': explanation,
                'probabilities': probabilities,
                'inputs': data
            }
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response_payload).encode('utf-8'))
            return

        # Live WML Mode
        try:
            api_key = os.environ.get('IBM_CLOUD_API_KEY')
            scoring_url = os.environ.get('WML_SCORING_URL')

            # 1. Get Access Token from IBM Cloud IAM
            token_url = 'https://iam.cloud.ibm.com/identity/token'
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            }
            data_payload = urllib.parse.urlencode({
                'grant_type': 'urn:ibm:params:oauth:grant-type:apikey',
                'apikey': api_key
            }).encode('utf-8')

            req = urllib.request.Request(token_url, data=data_payload, headers=headers)
            with urllib.request.urlopen(req) as response:
                token_res = json.loads(response.read().decode('utf-8'))
            
            access_token = token_res['access_token']

            # 2. Score request to WML
            wml_headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {access_token}',
                'Accept': 'application/json'
            }
            wml_req_body = json.dumps(req_data).encode('utf-8')
            wml_req = urllib.request.Request(scoring_url, data=wml_req_body, headers=wml_headers)
            
            with urllib.request.urlopen(wml_req) as response:
                wml_res = json.loads(response.read().decode('utf-8'))

            response_payload = {
                'mode': 'live',
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'raw': wml_res
            }
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response_payload).encode('utf-8'))

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'error': 'Failed to retrieve prediction from IBM Cloud WML service.',
                'details': str(e)
            }).encode('utf-8'))

def run():
    # Handle port binding issues gracefully
    server_address = ('', PORT)
    httpd = socketserver.TCPServer(server_address, ProxyHTTPRequestHandler)
    print(f"Python server running on http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server.")
        httpd.server_close()

if __name__ == '__main__':
    run()
