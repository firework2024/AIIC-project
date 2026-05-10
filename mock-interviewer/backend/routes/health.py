from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__)

@health_bp.route("/", methods=["GET"])
def health_check():
    return jsonify({
        "status": "ok",
        "message": "金融模拟面试后端运行中"
    })
