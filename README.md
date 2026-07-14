#  Power System Fault Detection and Classification

A machine learning–powered web application that detects and classifies faults in power systems using real-time telemetry data. Built with **IBM Watson Machine Learning (WML)** for model deployment and a full-stack web dashboard for visualization.

---

## 📌 Overview

Power system faults such as **line breakage**, **transformer failure**, and **overheating** can cause significant downtime and equipment damage. This project uses a classification model trained on historical fault data to predict fault types and severity in real time.

The system operates in two modes:
- **Live Mode** — Sends telemetry data to a deployed IBM Watson ML model for real predictions.
- **Demo/Mock Mode** — Uses threshold-based logic locally for testing without IBM Cloud credentials.

---

## 🛠️ Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| ML Platform | IBM Watson Machine Learning (WML)   |
| Backend     | Python (Flask), Node.js (Express)   |
| Frontend    | HTML, CSS, JavaScript               |
| Dataset     | Custom CSV (500+ fault records)     |
| Notebook    | Jupyter Notebook (EDA & Training)   |

---

## ✨ Features

- **Real-time fault classification** — Normal, Warning, or Critical
- **Confidence scoring** with probability breakdown
- **Interactive dashboard** with telemetry input sliders (Temperature, Vibration, Voltage, Current, Pressure)
- **Dual server support** — Python (`server.py`) and Node.js (`server.js`)
- **Live / Demo mode toggle** based on IBM Cloud credentials
- **Responsive UI** with modern design (glassmorphism, animations)

---

## 📁 Project Structure

```
├── public/                  # Frontend (HTML, CSS, JS for dashboard)
│   ├── index.html
│   ├── style.css
│   └── app.js
├── templates/               # Flask HTML templates
├── static/                  # Flask static assets
├── fault_data.csv           # Dataset (500+ records)
├── python notebook.ipynb    # Jupyter Notebook (EDA & model training)
├── server.py                # Python backend server
├── server.js                # Node.js backend server
├── app.py                   # Flask application
├── requirements.txt         # Python dependencies
├── package.json             # Node.js dependencies
├── .env.example             # Environment variable template
└── README.md
```

---

## 📊 Dataset

The dataset (`fault_data.csv`) contains **500+ fault records** with the following features:

| Column                | Description                     |
|-----------------------|---------------------------------|
| Fault ID              | Unique identifier               |
| Fault Type            | Line Breakage / Transformer Failure / Overheating |
| Fault Location        | Latitude, Longitude             |
| Voltage (V)           | System voltage reading          |
| Current (A)           | Current flow measurement        |
| Power Load (MW)       | Active power load               |
| Temperature (°C)      | Ambient / component temperature |
| Wind Speed (km/h)     | Environmental wind speed        |
| Weather Condition     | Clear / Rainy / Snowy / Windstorm / Thunderstorm |
| Maintenance Status    | Scheduled / Completed / Pending |
| Component Health      | Normal / Faulty / Overheated    |
| Duration of Fault     | Fault duration in hours         |
| Down time             | System downtime in hours        |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+ *(optional, for the Node server)*
- IBM Cloud account *(optional, for live mode)*

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/power-system-fault-detection.git
cd power-system-fault-detection
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and add your IBM Cloud credentials:

```env
IBM_CLOUD_API_KEY=your_api_key_here
WML_SCORING_URL=https://your-region.ml.cloud.ibm.com/ml/v4/deployments/your-id/predictions?version=2021-05-01
```

> **Note:** The app works in **Demo Mode** without credentials.

### 3. Run with Python

```bash
pip install -r requirements.txt
python server.py
```

Server starts at: `http://localhost:5000`


### Sample Prediction Request

```json
{
  "input_data": [{
    "fields": ["Temperature", "Vibration", "Voltage", "Current", "Pressure"],
    "values": [[90, 0.15, 180, 22, 7.0]]
  }]
}
```

### Sample Response

```json
{
     "prediction": "Critical Fault Detected",
     "confidence": 92.5,
     "mode": "demo"
   }
```

---


## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## 📜 License

This project is developed as part of an **IBM Internship Program**.

---
## 👤 Developer

Name: Abburi Tilak kumar  
Project: Power system Fault Detection & Classification using IBM Cloud ML

Tech Stack: Flask, IBM Cloud, Python
