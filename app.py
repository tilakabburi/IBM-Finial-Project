import os
from typing import Any

import requests
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

IBM_MODEL_URL = os.getenv("IBM_MODEL_URL", "").strip()
IBM_API_KEY = os.getenv("IBM_API_KEY", "").strip()
IBM_TOKEN = os.getenv("IBM_TOKEN", "").strip()


def build_headers() -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    token = IBM_TOKEN or IBM_API_KEY
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def normalize_payload(raw_payload: Any) -> Any:
    if isinstance(raw_payload, dict):
        return raw_payload
    if isinstance(raw_payload, str):
        import json

        try:
            return json.loads(raw_payload)
        except json.JSONDecodeError:
            return {"input": raw_payload}
    return {"input": raw_payload}


@app.route("/", methods=["GET"])
def index() -> str:
    return render_template(
        "index.html",
        configured=bool(IBM_MODEL_URL),
        sample_payload='{"temperature": 42, "vibration": 2.1, "current": 8.7}',
    )


@app.route("/predict", methods=["POST"])
def predict():
    if not IBM_MODEL_URL:
        return jsonify(
            {
                "error": "IBM_MODEL_URL is not configured.",
                "hint": "Set the IBM_MODEL_URL environment variable before starting the app.",
            }
        ), 500

    form_payload = request.form.get("payload", "").strip()
    if form_payload:
        payload = normalize_payload(form_payload)
    else:
        payload = request.get_json(silent=True) or {}
        if not isinstance(payload, (dict, list)):
            payload = {"input": payload}

    try:
        response = requests.post(
            IBM_MODEL_URL,
            json=payload,
            headers=build_headers(),
            timeout=30,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        return jsonify({"error": "Prediction request failed.", "details": str(exc)}), 502

    try:
        prediction = response.json()
    except ValueError:
        prediction = {"raw_response": response.text}

    return render_template("result.html", payload=payload, prediction=prediction)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
