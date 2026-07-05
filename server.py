import os
import asyncio
from flask import Flask, request, jsonify
from flask_cors import CORS
from rasa.core.agent import Agent

app = Flask(__name__)
CORS(app)

agent = None

def load_agent():
    global agent
    model_path = "rasa_project/models"
    # Find the latest model
    models = sorted([f for f in os.listdir(model_path) if f.endswith(".tar.gz")])
    if not models:
        print("No Rasa model found. Please train first.")
        return
    latest_model = os.path.join(model_path, models[-1])
    print(f"Loading model: {latest_model}")
    agent = Agent.load(latest_model)

@app.route('/parse', methods=['POST'])
def parse_command():
    if agent is None:
        return jsonify({"error": "Model not loaded"}), 500
    
    data = request.json
    text = data.get("text", "")
    
    # Run agent parse async using asyncio.run
    result = asyncio.run(agent.parse_message(text))
    
    intent = result.get("intent", {}).get("name")
    entities = result.get("entities", [])
    
    # Format according to game requirements
    formatted = {"action": intent}
    
    for ent in entities:
        role = ent.get("entity")
        val = ent.get("value")
        if role == "target":
            # the action logic usually uses 'target' or 'destination' depending on action
            if intent == "go":
                formatted["destination"] = val
            else:
                formatted["target"] = val
        elif role == "tool":
            formatted["tool"] = val
        elif role == "destination":
            formatted["destination"] = val
        elif role == "recipient":
            formatted["recipient"] = val
        elif role == "source":
            formatted["source"] = val
            
    return jsonify(formatted)

if __name__ == '__main__':
    # Make sure we're in the right directory or path is absolute
    if os.path.exists("rasa_project/models"):
        load_agent()
    app.run(port=5005, debug=True, use_reloader=False)
