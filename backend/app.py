"""
QORA Backend Application Entry Point
Flask REST API server for Hybrid Quantum-Classical Chest X-Ray Analysis
"""

import os
import sys
import io
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

if sys.platform == "win32":
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    except Exception:
        pass

# Load environment variables
load_dotenv()

from routes.predict import predict_bp


def create_app() -> Flask:
    """Application factory for QORA API Server."""
    app = Flask(__name__)
    
    # Configure maximum content length (e.g. 64 MB for large DICOM scans)
    app.config["MAX_CONTENT_LENGTH"] = 64 * 1024 * 1024

    # Enable CORS across all /api routes
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Register API Blueprints
    app.register_blueprint(predict_bp, url_prefix="/api")

    @app.route("/", methods=["GET"])
    def root():
        return jsonify({
            "service": "QORA - Quantum-Optimized Radiograph Analysis API",
            "status": "online",
            "documentation": {
                "health": "GET /api/health",
                "models": "GET /api/models",
                "predict": "POST /api/predict",
                "history": "GET /api/history",
                "regenerate_report": "POST /api/report/regenerate"
            }
        })

    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({"error": "Endpoint not found"}), 404

    @app.errorhandler(413)
    def request_entity_too_large(error):
        return jsonify({"error": "Uploaded image file exceeds the 64MB limit"}), 413

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "Internal server error occurred"}), 500

    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    host = os.getenv("HOST", "0.0.0.0")
    debug = os.getenv("FLASK_DEBUG", "1") == "1"
    print(f"[INFO] QORA Backend Server starting on http://{host}:{port}")
    app.run(host=host, port=port, debug=debug)
