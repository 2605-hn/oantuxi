# Quantum Hand Duel — Browser Demo

A browser-hosted Rock–Paper–Scissors–Lizard–Spock demo based on the original Qiskit Hackathon IITR 2021 project.

## Demo features
- Responsive browser UI; no Eel desktop window required.
- Webcam preview using the browser camera API.
- Five selectable gestures and first-to-five scoring.
- Flask backend and Qiskit Aer-based computer move generation.
- Optional TensorFlow image classification endpoint when a trained model is supplied.

## Quick start

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Visit `http://127.0.0.1:5000`.

See [DEPLOY-RENDER.md](DEPLOY-RENDER.md) for public deployment instructions and optional TensorFlow setup.

## Important model limitation
The original source archive does not include `assets/model/hand_gesture_classify_model.h5` or the training dataset under `assets/data/`. Consequently, the browser demo supports manual gesture selection and webcam preview immediately; automatic gesture recognition requires the separately trained model.

## Credits
Original project: Team Random Chaos, Qiskit Fall Fest Hackathon IITR 2021. See `assets/docs/` and the original source files under `src/`.
