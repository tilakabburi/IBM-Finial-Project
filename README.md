# AI-Powered Plant Disease Detection System

A comprehensive web application that utilizes deep learning (PyTorch) and cloud services (IBM Cloud, MongoDB) to detect plant diseases from images, provide diagnosis, and recommend treatment plans.

## Features

- **Image-Based Disease Detection**: Upload a photo of a plant leaf to get an instant diagnosis.
- **AI-Powered Analysis**: Uses a fine-tuned Convolutional Neural Network (CNN) to classify plant health.
- **Interactive Diagnosis Interface**:
    - Visual display of the uploaded image.
    - Confidence scores for detected diseases.
    - Recommended treatment plans and preventative measures.
- **User Management**: Secure login, registration, and session management.
- **Modern UI**: Built with React and Bootstrap for a responsive and user-friendly experience.

## Tech Stack

- **Frontend**: React.js, Bootstrap
- **Backend**: Node.js, Express.js
- **AI/ML**: PyTorch, NumPy, OpenCV
- **Database**: MongoDB (MongoDB Atlas)
- **Cloud Services**: IBM Cloud (IBM Cloudant / Discovery)
- **Deployment**: Docker, Cloud Foundry (Optional)

## Project Structure

```
AI-Plant-Disease-Detection-System/
├── frontend/                  # React Application
│   ├── src/
│   │   ├── components/        # React Components (Login, Home, etc.)
│   │   ├── services/        # API Services (axios calls)
│   │   ├── App.js             # Main App component
│   │   └── index.js           # Entry point
│   └── package.json
├── backend/                   # Node.js Application
│   ├── api/                 # API Routes
│   ├── config/              # Database & Cloud Config
│   ├── models/              # Mongoose Models (User, PlantDisease)
│   ├── middleware/          # Authentication Middleware
│   ├── server.js            # Express Server Entry Point
│   └── package.json
└── models/                    # AI Model Artifacts
    ├── plant_disease_model.pt # PyTorch Model File
    ├── class_to_disease.json  # Disease Mapping
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (or access to MongoDB Atlas)
- Python 3.x (for running PyTorch model locally if needed)

### Installation

1.  **Clone the repository**

    ```bash
    git clone <repository-url>
    cd AI-Plant-Disease-Detection-System
    ```

2.  **Install Backend Dependencies**

    ```bash
    cd backend
    npm install
    ```

3.  **Install Frontend Dependencies**

    ```bash
    cd ../frontend
    npm install
    ```

4.  **Configure Environment Variables**

    Create a `.env` file in the `backend/` directory with the following variables:

    ```env
    PORT=5000
    MONGO_URI=<your-mongodb-connection-string>
    JWT_SECRET=<your-jwt-secret>
    IBM_CLOUDANT_URL=<your-ibm-cloudant-url>
    IBM_CLOUDANT_DB=<your-database-name>
    ```

### Usage

1.  **Start the Backend**

    ```bash
    cd backend
    npm start
    ```

2.  **Start the Frontend**

    ```bash
    cd ../frontend
    npm start
    ```

    The application will be accessible at `http://localhost:3000`.

## Running the Model Separately

If you need to run the PyTorch model locally (outside the Express API):

1.  **Navigate to the model directory:**
    ```bash
    cd models
    ```

2.  **Run the model inference script:**
    ```bash
    python test_model.py <path-to-image>
    ```