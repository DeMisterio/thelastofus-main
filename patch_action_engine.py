import re

with open("event_control/action_control/action_engine.js", "r") as f:
    content = f.read()

new_functions = """
function inspect_item(entities, actor) {
    const items = entities.item || [];
    const locs = entities.location || [];
    const sublocs = entities.sublocation || [];
    
    if (locs.length > 0 || sublocs.length > 0) {
        let loc = locs[0] || sublocs[0];
        return "True. " + location_descr_generator(loc);
    }
    
    if (items.length > 0) {
        let itemID = items[0];
        try {
            let it = new item(itemID);
            return `True. It's a ${it.type}. Looks like its functionality is ${it.functionality || 'unknown'}.`;
        } catch (e) {
            return `False. I don't see ${itemID} here.`;
        }
    }
    return "True. " + location_descr_generator(null);
}

function unlock_item(entities, actor) {
    const items = entities.item || [];
    if (items.length < 1) return "False. Unlock what?";
    
    let target = items.find(id => {
        try { return new item(id).functionality !== "unlock"; } catch(e) { return true; }
    });
    let key = items.find(id => {
        try { return new item(id).functionality === "unlock"; } catch(e) { return false; }
    });
    
    if (!key) {
        // check inventory for key
        key = actor.init_items.find(id => {
            try { return new item(id).functionality === "unlock"; } catch(e) { return false; }
        });
    }
    
    if (!key) return "False. I don't have the key.";
    if (!target) return "False. I need something to unlock.";
    
    return `True. I unlocked the ${target} using ${key}.`;
}

function sit_action(entities, actor) {
    if (actor.endurance !== null) {
        actor.endurance += 20;
        if (actor.endurance > 100) actor.endurance = 100;
    }
    return "True. I sat down and rested for a bit.";
}

function pickup_item(entities, actor) {
    const items = entities.item || [];
    if (items.length === 0) return "False. Pick up what?";
    
    let targetItemID = items[0];
    
    const currentLoc = GameControl.current_location;
    let found = false;
    
    if (currentLoc.sub_locations) {
        for (let subLoc of currentLoc.sub_locations) {
            const setId = subLoc.items_id;
            const itemSet = ITEMSdata.sets.find(s => s.id === setId);
            if (itemSet && itemSet.containers) {
                for (let contRef of itemSet.containers) {
                    const realContainer = ITEMSdata.containers.find(c => c.id === contRef.id);
                    if (realContainer && realContainer.items) {
                        const idx = realContainer.items.findIndex(it => it.id === targetItemID);
                        if (idx > -1) {
                            realContainer.items.splice(idx, 1);
                            found = true;
                            break;
                        }
                    }
                }
            }
            if (found) break;
        }
    }
    
    if (!found) {
        return `False. I don't see ${targetItemID} here to pick up.`;
    }
    
    actor.init_items.push(targetItemID);
    return `True. I picked up the ${targetItemID}.`;
}

function punch_target(entities, actor) {
    const chars = entities.characters || [];
    if (chars.length === 0) return "False. Punch who?";
    
    const targetName = chars[0];
    const currentLoc = GameControl.current_location;
    const targetChar = currentLoc.characters.find(c => 
        c.name.toLowerCase() === targetName.toLowerCase() || 
        (c.tokens && c.tokens.includes(targetName))
    );
    
    if (!targetChar) return `False. ${targetName} is not here.`;
    
    if (targetChar.health !== null) {
        targetChar.health -= 15;
    }
    
    let reaction = "Ouch!";
    if (targetChar.verbal_reactions && targetChar.verbal_reactions["attack"]) {
        reaction = targetChar.verbal_reactions["attack"][0];
    }
    
    return `True. I punched ${targetChar.name} right in the face! "${reaction}"`;
}

function throw_item(entities, actor) {
    const items = entities.item || [];
    if (items.length === 0) return "False. Throw what?";
    
    let targetItemID = items[0];
    let idx = actor.init_items.indexOf(targetItemID);
    
    if (idx === -1) {
        return `False. I don't have ${targetItemID} to throw.`;
    }
    
    actor.init_items.splice(idx, 1);
    
    return `True. I threw the ${targetItemID} away.`;
}

function open_item(entities, actor) {
    const items = entities.item || [];
    if (items.length === 0) return "False. Open what?";
    return `True. I opened the ${items[0]}. It's empty.`;
}

"""

# Insert the new functions right before export function action_identifier
target_str = "// This function will figure out what to do next\nexport function action_identifier("
if target_str in content:
    content = content.replace(target_str, new_functions + target_str)

# Update the switch statement
switch_cases = """
    case "inspect": {
        const res = inspect_item(entities, actor);
        result = res;
        logStatus = { success: res.startsWith("True"), reason: res };
        break;
    }
    case "unlock": {
        const res = unlock_item(entities, actor);
        result = res;
        logStatus = { success: res.startsWith("True"), reason: res };
        break;
    }
    case "sit": {
        const res = sit_action(entities, actor);
        result = res;
        logStatus = { success: res.startsWith("True"), reason: res };
        break;
    }
    case "pickup": {
        const res = pickup_item(entities, actor);
        result = res;
        logStatus = { success: res.startsWith("True"), reason: res };
        break;
    }
    case "punch": {
        const res = punch_target(entities, actor);
        result = res;
        logStatus = { success: res.startsWith("True"), reason: res };
        break;
    }
    case "throw":
    case "put":
    case "store_items": {
        const res = throw_item(entities, actor);
        result = res;
        logStatus = { success: res.startsWith("True"), reason: res };
        break;
    }
    case "open": {
        const res = open_item(entities, actor);
        result = res;
        logStatus = { success: res.startsWith("True"), reason: res };
        break;
    }
    case "hook":
    case "signal":
        result = "True. I did the action, but nothing happened.";
        logStatus = { success: true, reason: "Fallback logic applied" };
        break;
"""

default_case_str = "default:\n        result = false;"
if default_case_str in content:
    content = content.replace(default_case_str, switch_cases + "    " + default_case_str)

with open("event_control/action_control/action_engine.js", "w") as f:
    f.write(content)

print("action_engine.js patched successfully.")
