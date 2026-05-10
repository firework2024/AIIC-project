from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os
from routes.topics import topics_bp



# Load environment variables
load_dotenv()

def create_app():
    app = Flask(__name__)

    # Enable CORS for frontend (React)
    CORS(
        app,
        resources={r"/api/*": {"origins": "*"}}
    )


    # Basic config
    app.config["ENV"] = os.getenv("FLASK_ENV", "development")
    app.config["JSON_SORT_KEYS"] = False

    # Register routes
    from routes.interview import interview_bp
    from routes.health import health_bp

    app.register_blueprint(interview_bp, url_prefix="/api/interview")
    app.register_blueprint(health_bp, url_prefix="/api/health")
    app.register_blueprint(topics_bp, url_prefix="/api/topics")
    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
