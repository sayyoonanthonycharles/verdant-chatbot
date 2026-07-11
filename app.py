import os
from flask import Flask, request, jsonify, send_from_directory
from dotenv import load_dotenv
import requests

load_dotenv()  # reads variables from a .env file in this folder

app = Flask(__name__, static_folder=".", static_url_path="")

# Put your key in a .env file next to this script:
#   GEMINI_API_KEY=your_key_here
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.0-flash:generateContent"
)

SYSTEM_PROMPT = (
    "You are Verdant, a calm, warm, and thoughtful AI assistant. "
    "Keep replies clear and conversational, not overly long."
)


@app.route("/")
def index():
    return send_from_directory(".", "index.html")


@app.route("/api/chat", methods=["POST"])
def chat():
    if not GEMINI_API_KEY:
        return jsonify({
            "reply": "Server isn't configured with a GEMINI_API_KEY yet. "
                      "Set that environment variable and restart the app."
        }), 200

    data = request.get_json(force=True) or {}
    message = (data.get("message") or "").strip()
    history = data.get("history") or []

    if not message:
        return jsonify({"error": "Empty message"}), 400

    # Build Gemini "contents" from the running history + system prompt
    contents = [
        {"role": "user", "parts": [{"text": SYSTEM_PROMPT}]},
        {"role": "model", "parts": [{"text": "Understood, I'm ready to help."}]},
    ]
    for turn in history[-10:]:  # keep last 10 turns for context
        role = "user" if turn.get("role") == "user" else "model"
        contents.append({"role": role, "parts": [{"text": turn.get("content", "")}]})

    contents.append({"role": "user", "parts": [{"text": message}]})

    try:
        resp = requests.post(
            f"{GEMINI_URL}?key={GEMINI_API_KEY}",
            json={"contents": contents},
            timeout=30,
        )
        resp.raise_for_status()
        result = resp.json()
        reply = (
            result["candidates"][0]["content"]["parts"][0]["text"].strip()
        )
    except Exception as exc:
        reply = f"Something went wrong talking to the model: {exc}"

    return jsonify({"reply": reply})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)