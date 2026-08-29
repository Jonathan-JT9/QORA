"""QORA Flask application (routes wired in subsequent steps)."""

from __future__ import annotations

import os

from flask import Flask, jsonify
from flask_cors import CORS


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)
    app.config["MAX_CONTENT_LENGTH"] = 32 * 1024 * 1024
    app.config["UPLOAD_FOLDER"] = os.path.join(os.path.dirname(__file__), "uploads")
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    @app.get("/api/health")
    def health() -> tuple:
        return jsonify({"status": "ok", "service": "QORA"}), 200

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
