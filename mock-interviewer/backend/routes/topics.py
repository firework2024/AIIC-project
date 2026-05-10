from flask import Blueprint, jsonify
from config.topics import TOPICS

topics_bp = Blueprint("topics", __name__)

@topics_bp.route("/", methods=["GET"])
def get_topics():
    return jsonify(TOPICS)
