import os
import glob
import json
import random
import asyncio
import time
from rasa.core.agent import Agent

# Vocabulary for algorithmic generation of test phrases
PREFIXES = ["i want to", "let me", "please", "quickly", "carefully", "aggressively", "slowly", "just", "gotta", "wanna", "lemme", ""]
SUFFIXES = ["now", "right now", "please", "immediately", "hurry", "asap", "carefully", "quietly", ""]

VOCAB = {
    "go": {
        "verbs": ["go", "run", "walk", "sneak", "move", "head", "escape", "flee", "rush", "sprint"],
        "targets": ["kitchen", "hallway", "door", "street", "car", "basement", "balcony", "living room", "bus stop"],
        "templates": ["{prefix} {verb} to the {target} {suffix}", "{prefix} {verb} towards the {target}"]
    },
    "inspect": {
        "verbs": ["inspect", "look at", "examine", "search", "investigate", "check out", "scan", "observe"],
        "targets": ["room", "box", "corpse", "drawer", "desk", "area", "fridge", "car", "sink", "wardrobe"],
        "templates": ["{prefix} {verb} the {target} {suffix}", "{prefix} what is in the {target}"]
    },
    "pickup": {
        "verbs": ["take", "pick up", "grab", "collect", "snatch", "acquire", "retrieve", "steal", "scoop up"],
        "targets": ["keys", "gun", "bottle", "brick", "knife", "ammo", "backpack", "medkit", "flashlight", "food"],
        "sources": ["table", "ground", "sofa", "drawer", "wardrobe", "floor"],
        "templates": ["{prefix} {verb} the {target} {suffix}", "{prefix} {verb} the {target} from the {source}"]
    },
    "attack": {
        "verbs": ["attack", "hit", "strike", "smash", "bash", "hurt", "beat", "fight", "destroy"],
        "targets": ["zombie", "enemy", "man", "infected", "clicker", "runner", "guard", "bloater", "Tom"],
        "tools": ["bat", "knife", "pipe", "hammer", "machete", "baseball bat", "brick", "fists"],
        "templates": ["{prefix} {verb} the {target} {suffix}", "{prefix} {verb} the {target} with my {tool}"]
    },
    "cut": {
        "verbs": ["cut", "slice", "sever", "slash", "tear", "rip open", "stab"],
        "targets": ["rope", "bread", "wire", "cable", "net", "box", "tape", "fabric", "bag"],
        "tools": ["scissors", "knife", "shiv", "blade", "glass shard", "razor blades", "hunting knife"],
        "templates": ["{prefix} {verb} the {target} {suffix}", "{prefix} {verb} the {target} using the {tool}"]
    },
    "shoot": {
        "verbs": ["shoot", "fire at", "blast", "aim at", "snipe", "open fire on"],
        "targets": ["zombie", "enemy", "clicker", "lock", "door", "guard", "runner", "car", "Tom"],
        "tools": ["pistol", "gun", "rifle", "revolver", "shotgun", "Glock-19", "assault rifle", "weapon"],
        "templates": ["{prefix} {verb} the {target} {suffix}", "{prefix} {verb} the {target} with the {tool}"]
    },
    "ignite": {
        "verbs": ["ignite", "burn", "light", "set fire to", "start a fire on", "torch"],
        "targets": ["wood", "gasoline", "trash", "paper", "molotov", "corpse", "bushes", "car", "sofa"],
        "tools": ["lighter", "matches", "flare", "torch"],
        "templates": ["{prefix} {verb} the {target} {suffix}", "{prefix} {verb} the {target} using {tool}"]
    },
    "eat": {
        "verbs": ["eat", "consume", "chew on", "swallow", "devour", "munch on", "gobble up", "taste"],
        "targets": ["bread", "food", "jerky", "apple", "canned beans", "pills", "ration", "chips", "chocolate"],
        "templates": ["{prefix} {verb} the {target} {suffix}", "{prefix} have a bite of the {target}"]
    },
    "drink": {
        "verbs": ["drink", "sip", "consume", "gulp down", "chug", "taste", "down"],
        "targets": ["water", "bottle", "coffee", "soda", "juice", "liquid", "tea", "beer", "canteen"],
        "templates": ["{prefix} {verb} the {target} {suffix}", "{prefix} take a sip of the {target}"]
    },
    "give": {
        "verbs": ["give", "hand", "pass", "transfer", "offer", "yield", "share"],
        "targets": ["gun", "water", "medkit", "ammo", "keys", "food", "knife", "blanket", "phone"],
        "recipients": ["Zack", "him", "Ellie", "Joel", "Sarah", "Tom", "Alex", "her", "the man"],
        "templates": ["{prefix} {verb} the {target} to {recipient} {suffix}", "{prefix} {verb} {recipient} the {target}"]
    },
    "wear": {
        "verbs": ["wear", "put on", "equip", "dress in", "slip on", "wrap"],
        "targets": ["mask", "gloves", "shoes", "jacket", "helmet", "armor", "gas mask", "blanket", "coat"],
        "templates": ["{prefix} {verb} the {target} {suffix}", "{prefix} put the {target} on"]
    },
    "unlock": {
        "verbs": ["unlock", "open", "pick the lock on", "unlatch", "crack", "break the lock on"],
        "targets": ["door", "safe", "glovebox", "gate", "chest", "window", "padlock", "car", "trunk"],
        "tools": ["keys", "shiv", "key", "car keys", "house keys"],
        "templates": ["{prefix} {verb} the {target} {suffix}", "{prefix} {verb} the {target} with my {tool}"]
    },
    "sit": {
        "verbs": ["sit", "rest", "take a seat", "collapse", "plop down", "relax", "settle down"],
        "targets": ["chair", "sofa", "bench", "floor", "bed", "ground", "car seat", "back seat"],
        "templates": ["{prefix} {verb} on the {target} {suffix}", "{prefix} {verb} down"]
    },
    "punch": {
        "verbs": ["punch", "hit", "strike", "beat up", "slug", "slap", "smack", "kick"],
        "targets": ["man", "enemy", "guard", "zombie", "runner", "Tom", "Alex", "him", "her", "gang leader"],
        "templates": ["{prefix} {verb} the {target} {suffix}", "{prefix} {verb} {target} in the face"]
    },
    "throw": {
        "verbs": ["throw", "toss", "hurl", "lob", "chuck", "chunk"],
        "targets": ["lighter", "dead woman", "brick", "grenade", "bottle", "rock", "keys", "phone", "knife", "gun"],
        "recipients": ["fence", "window", "enemies", "clicker", "Alex", "Tom", "him"], # treated as secondary targets
        "templates": ["{prefix} {verb} the {target} {suffix}", "{prefix} {verb} the {target} at the {recipient}"]
    },
    "open": {
        "verbs": ["open", "unseal", "pull open", "pry open", "crack open", "pop open"],
        "targets": ["drawer", "fridge", "door", "box", "cabinet", "trunk", "bag", "crate", "glovebox", "safe"],
        "templates": ["{prefix} {verb} the {target} {suffix}", "{prefix} look inside the {target}"]
    },
    "put": {
        "verbs": ["put", "place", "set", "drop", "leave", "toss", "slip"],
        "targets": ["gun", "bottle", "box", "keys", "bag", "note", "knife", "food", "phone", "blanket"],
        "destinations": ["table", "floor", "desk", "door", "fridge", "drawer", "shelf", "sofa", "backpack"],
        "templates": ["{prefix} {verb} the {target} on the {destination} {suffix}", "{prefix} {verb} the {target} down"]
    },
    "store_items": {
        "verbs": ["put", "store", "place", "stash", "hide", "keep", "tuck"],
        "targets": ["keys", "food", "gun", "ammo", "knife", "medkit", "water", "phone", "passport"],
        "destinations": ["box", "fridge", "safe", "backpack", "drawer", "cabinet", "car", "glovebox", "bag", "bed"],
        "templates": ["{prefix} {verb} the {target} in the {destination} {suffix}", "{prefix} {verb} the {target} away"]
    },
    "hook": {
        "verbs": ["hook", "pull", "grab", "catch", "drag"],
        "targets": ["keys", "bag", "ladder", "crate", "item", "box", "ledge", "car"],
        "tools": ["hook", "pole", "rope", "stick", "chain"],
        "templates": ["{prefix} {verb} the {target} {suffix}", "{prefix} {verb} the {target} using the {tool}"]
    },
    "warm": {
        "verbs": ["warm", "heat up", "keep warm", "warm up"],
        "targets": ["Zack", "myself", "food", "her", "Tom", "Alex", "him", "it"],
        "tools": ["blanket", "fire", "jacket", "heater", "campfire"],
        "templates": ["{prefix} {verb} {target} {suffix}", "{prefix} {verb} {target} with the {tool}"]
    },
    "signal": {
        "verbs": ["signal", "send a signal", "wave my hands", "wave", "call", "fire", "shoot"],
        "targets": ["ship", "rescue boat", "boat", "them"],
        "tools": ["flare", "radio"],
        "templates": ["{prefix} signal the {target} {suffix}", "{prefix} {verb} the {tool} to signal"]
    }
}

def generate_prompts(intent, data, count=10):
    prompts = set()
    templates = data.get("templates", [])
    
    while len(prompts) < count:
        t = random.choice(templates)
        
        # Replace tokens
        phrase = t.replace("{prefix}", random.choice(PREFIXES))
        phrase = phrase.replace("{suffix}", random.choice(SUFFIXES))
        
        if "{verb}" in phrase: phrase = phrase.replace("{verb}", random.choice(data.get("verbs", [""])))
        if "{target}" in phrase: phrase = phrase.replace("{target}", random.choice(data.get("targets", ["it"])))
        if "{tool}" in phrase: phrase = phrase.replace("{tool}", random.choice(data.get("tools", ["thing"])))
        if "{source}" in phrase: phrase = phrase.replace("{source}", random.choice(data.get("sources", ["somewhere"])))
        if "{destination}" in phrase: phrase = phrase.replace("{destination}", random.choice(data.get("destinations", ["there"])))
        if "{recipient}" in phrase: phrase = phrase.replace("{recipient}", random.choice(data.get("recipients", ["someone"])))
        
        # Clean up double spaces
        phrase = " ".join(phrase.split()).strip()
        if phrase:
            prompts.add(phrase)
            
    return list(prompts)

async def test_model():
    print("[*] Loading latest Rasa NLU model...")
    agent = Agent.load("models/")
    
    results = {}
    total_accuracy_tracker = {"correct": 0, "total": 0}
    
    print("[*] Generating 10 test prompts for each intent (Total 210)...")
    for intent, data in VOCAB.items():
        print(f"  -> Testing Intent: {intent}")
        test_phrases = generate_prompts(intent, data, count=10)
        
        results[intent] = {
            "correct": 0,
            "failed": 0,
            "failed_phrases": [],
            "samples": []
        }
        
        for phrase in test_phrases:
            response = await agent.parse_message(phrase)
            predicted_intent = response.get("intent", {}).get("name")
            confidence = response.get("intent", {}).get("confidence", 0)
            entities = response.get("entities", [])
            
            is_correct = (predicted_intent == intent)
            
            if is_correct:
                results[intent]["correct"] += 1
                total_accuracy_tracker["correct"] += 1
            else:
                results[intent]["failed"] += 1
                results[intent]["failed_phrases"].append({
                    "phrase": phrase,
                    "predicted": predicted_intent,
                    "confidence": confidence
                })
                
            total_accuracy_tracker["total"] += 1
            
            # Save 5 samples per intent to json just for review
            if len(results[intent]["samples"]) < 5:
                results[intent]["samples"].append({
                    "phrase": phrase,
                    "predicted_intent": predicted_intent,
                    "confidence": confidence,
                    "entities_extracted": [{"entity": e["entity"], "value": e["value"]} for e in entities]
                })

    final_accuracy = (total_accuracy_tracker['correct'] / total_accuracy_tracker['total']) * 100
    results["OVERALL_SUMMARY"] = {
        "total_tested": total_accuracy_tracker["total"],
        "total_correct": total_accuracy_tracker["correct"],
        "accuracy_percentage": round(final_accuracy, 2)
    }

    print(f"[*] Testing Complete! Overall Accuracy: {final_accuracy:.2f}%")
    
    output_file = "test_results.json"
    with open(output_file, "w") as f:
        json.dump(results, f, indent=4)
    print(f"[*] Full test results saved to {output_file}")

if __name__ == "__main__":
    # Ensure there's a model in the models folder
    if not glob.glob("models/*.tar.gz"):
        print("[-] Error: No trained model found in 'models/' directory.")
        exit(1)
        
    asyncio.run(test_model())
