# Deploy Quantum Hand Duel demo to Render

## What works in this demo
- Browser UI and webcam preview (camera permission requires HTTPS or localhost).
- Play the three classic gestures (Búa, Bao, Kéo) using on-screen buttons.
- Flask API computes the result and asks Qiskit Aer for the computer move.
- TensorFlow inference endpoint is enabled only when the trained model file is supplied.

## Run locally

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Open http://127.0.0.1:5000.

## Render
1. Push the extracted project contents to the root of a GitHub repository.
2. In Render, create **New + → Web Service** and connect that repository.
3. Runtime: Python 3.11. Build command: `pip install -r requirements.txt`.
4. Start command: `gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --threads 4 --timeout 120`.
5. Deploy. Open the HTTPS URL, allow camera access, and test the three move buttons.

## Enable TensorFlow hand recognition later
The supplied archive does **not** contain the trained model or image dataset. After training the original notebook, place
`hand_gesture_classify_model.h5` at `assets/model/hand_gesture_classify_model.h5`.
Then install the optional dependency set on Python 3.11 (`pip install -r requirements-ai.txt`) and redeploy. The model class order must match the original notebook's `flow_from_directory` class ordering; confirm the generated `class_indices` before relying on inference.

## Quantum RNG note
Qiskit Aer is a classical simulator of a quantum circuit. This demo samples a 2-qubit Hadamard circuit and rejects value 3 to obtain one of three moves without modulo bias. It is **not** a claim of randomness from physical quantum hardware.
