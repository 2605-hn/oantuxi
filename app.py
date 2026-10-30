"""Browser-hosted demo for classic Rock-Paper-Scissors.
TensorFlow inference is enabled when assets/model/hand_gesture_classify_model.h5 exists.
Qiskit Aer is used for the computer's move when installed; a secure system RNG is the fallback.
"""
from pathlib import Path
import io
import os
import secrets

from flask import Flask, jsonify, request, send_from_directory

ROOT = Path(__file__).resolve().parent
WEB_DIR = ROOT / "src" / "web"
MODEL_PATH = ROOT / "assets" / "model" / "hand_gesture_classify_model.h5"
app = Flask(__name__, static_folder=None)
_model = None
_model_error = None

MOVES = ["rock", "paper", "scissors"]
# Original model classes: lizard, none, paper, rock, scissors, spock.
# Only the three classic gestures are accepted by this version.
CLASS_TO_MOVE = {2: 1, 3: 0, 4: 2}


def quantum_move():
    """Return 0..2 using a 2-qubit Qiskit Aer measurement with rejection sampling."""
    try:
        from qiskit import QuantumCircuit, transpile
        from qiskit_aer import AerSimulator

        simulator = AerSimulator()
        for _ in range(8):
            circuit = QuantumCircuit(2, 2)
            circuit.h([0, 1])
            circuit.measure([0, 1], [0, 1])
            compiled = transpile(circuit, simulator)
            result = simulator.run(compiled, shots=1).result()
            bits = next(iter(result.get_counts().keys())).replace(" ", "")
            value = int(bits, 2)
            if value < 3:
                return value, "Qiskit Aer simulator"
        # Mathematically negligible fallback if all sampled values are 3.
        return secrets.randbelow(3), "system RNG fallback"
    except Exception as exc:
        app.logger.warning("Qiskit unavailable; using system RNG: %s", exc)
        return secrets.randbelow(3), "system RNG fallback (Qiskit unavailable)"


def get_model():
    global _model, _model_error
    if _model is not None:
        return _model
    if _model_error:
        return None
    if not MODEL_PATH.is_file():
        _model_error = "Chưa có model TensorFlow. Hãy đặt hand_gesture_classify_model.h5 vào assets/model/."
        return None
    try:
        from tensorflow import keras
        _model = keras.models.load_model(MODEL_PATH)
        return _model
    except Exception as exc:
        _model_error = f"Không tải được model TensorFlow: {exc}"
        app.logger.exception(_model_error)
        return None


@app.get("/")
def index():
    return send_from_directory(WEB_DIR, "index.html")


@app.get("/<path:filename>")
def web_files(filename):
    return send_from_directory(WEB_DIR, filename)


@app.get("/api/status")
def status():
    model = get_model()
    try:
        import qiskit  # noqa: F401
        import qiskit_aer  # noqa: F401
        qiskit_ready = True
    except Exception:
        qiskit_ready = False
    return jsonify({
        "ok": True,
        "tensorflow_model": model is not None,
        "tensorflow_message": None if model is not None else (_model_error or "Model chưa sẵn sàng."),
        "qiskit": qiskit_ready,
        "moves": MOVES,
    })


@app.post("/api/round")
def play_round():
    payload = request.get_json(silent=True) or {}
    player = payload.get("player_move")
    if player not in MOVES:
        return jsonify({"error": "Nước đi không hợp lệ."}), 400
    computer_index, rng_source = quantum_move()
    computer = MOVES[computer_index]
    # Classic rules: rock beats scissors, paper beats rock, scissors beats paper.
    defeats = {
        "rock": {"scissors"},
        "paper": {"rock"},
        "scissors": {"paper"},
    }
    if player == computer:
        outcome = "tie"
    elif computer in defeats[player]:
        outcome = "win"
    else:
        outcome = "lose"
    return jsonify({"player": player, "computer": computer, "outcome": outcome, "rng_source": rng_source})


@app.post("/api/classify")
def classify_image():
    model = get_model()
    if model is None:
        return jsonify({"error": _model_error or "Model TensorFlow chưa sẵn sàng."}), 503
    image = request.files.get("image")
    if image is None:
        return jsonify({"error": "Thiếu ảnh webcam."}), 400
    try:
        import numpy as np
        from tensorflow import keras
        raw = image.read()
        img = keras.preprocessing.image.load_img(io.BytesIO(raw), target_size=(224, 224))
        array = keras.preprocessing.image.img_to_array(img).reshape(1, 224, 224, 3)
        array = keras.applications.imagenet_utils.preprocess_input(array)
        predictions = model.predict(array, verbose=0)
        class_id = int(np.argmax(predictions))
        confidence = float(np.max(predictions))
        move_index = CLASS_TO_MOVE.get(class_id)
        if move_index is None:
            return jsonify({"error": "Không nhận diện được cử chỉ. Hãy đưa bàn tay rõ hơn vào khung hình.", "confidence": confidence}), 422
        return jsonify({"move": MOVES[move_index], "confidence": confidence})
    except Exception as exc:
        app.logger.exception("Image classification failed")
        return jsonify({"error": f"Không xử lý được ảnh: {exc}"}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)
