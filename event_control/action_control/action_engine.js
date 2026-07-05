import { match_items } from './parse_engine.js/semantic_parser.js'
import { tokenized } from './parse_engine.js/tokenizer.js'
import { item, GameControl, ITEMSdata, location, character } from '../entity_system/entity_init/objective_export.js'
import { Logger } from '../../log_system/log_it.js'

function prettifyName(raw) {
    if (!raw) return '';
    return raw.toString().replace(/_/g, ' ');
}

function findCharacterSafe(currentLoc, charName) {
    if (!currentLoc || !currentLoc.characters || !charName) return null;
    return currentLoc.characters.map(c => typeof c === 'string' ? GameControl.getChar(c) : c)
        .find(c => c && c.name && (c.name.toLowerCase() === charName.toLowerCase() || (c.tokens && c.tokens.includes(charName))));
}

export function location_descr_generator(subLocationInput, locationObj = GameControl?.current_location) {
    const activeLocation = locationObj || GameControl?.current_location;
    const subLocation = typeof subLocationInput === 'string'
        ? activeLocation?.sub_locations?.find(sl => sl.name === subLocationInput)
        : subLocationInput;

    if (!subLocation) {
        return '';
    }
    // || is operator so if subLocation is null or undefined, it will use the activeLocation
    const initDescription = subLocation.init_description || `I am now in ${prettifyName(subLocation.name)}`;
    const itemsSet = ITEMSdata?.sets?.find(set => set.id === subLocation.items_id);
    const containers = itemsSet?.containers || [];

    const containerNames = containers.map(cont => prettifyName(cont.id)).filter(Boolean);
    const containerListText = containerNames.length ? containerNames.join(', ') : 'nothing notable';

    const surfaceContainers = containers.filter(cont => cont.verbs?.some(v => v === 'on the' || v === 'under the')).slice(0, 2);
    const itemPhrases = [];
    // going through surface containers to find items
    for (const cont of surfaceContainers) {
        const verb = cont.verbs.find(v => v === 'on the' || v === 'under the') || cont.verbs?.[0] || '';
        const baseContainer = ITEMSdata?.containers?.find(c => c.id === cont.id);
        const items = baseContainer?.items || [];
        if (!items.length) continue;

        const itemNames = items.map(it => prettifyName(it.name || it.id)).filter(Boolean);
        if (!itemNames.length) continue;

        itemPhrases.push(`the ${itemNames.join(', ')} ${verb} ${prettifyName(cont.id)}`);
    }

    const itemText = itemPhrases.length ? itemPhrases.join('; ') : 'nothing else of note';

    const characters = (activeLocation?.characters || []).filter(ch => {
        if (!ch) return false;
        if (typeof ch === 'string') return true;
        if (typeof ch.health === 'number') return ch.health > 0;
        return true;
    }).map(ch => typeof ch === 'string' ? prettifyName(ch) : prettifyName(ch.name));

    const charVerb = characters.length === 1 ? 'is' : 'are';
    const characterText = characters.length ? characters.join(', ') : 'no one else';

    return `${initDescription}. Here, I see ${containerListText}. I also see ${itemText}. There ${charVerb} ${characterText}.`;
}

// Just an example of server output for testing purposes
let inpsample = {
    "text": "fix the car door with screwdriver",
    "intent": {
      "name": "fix",
      "confidence": 0.9634
    },
    "entities": [
      {
        "entity": "tool",
        "value": "screwdriver",
        "start": 27,
        "end": 33,
        "confidence_entity": 0.98,
        "extractor": "DIETClassifier"
      },
      {
        "entity": "item",
        "value": "car_door",
        "start": 38,
        "end": 46,
        "confidence_entity": 0.95,
        "extractor": "DIETClassifier"
      }
    ],
  }

function give_item(entities, actor) {
    const items = entities.item || [];
    const chars = entities.characters || [];
    const locs = entities.location || [];
    const sublocs = entities.sublocation || [];
    const isSelf = chars.some(c => c.toLowerCase() === "me");
    if (isSelf || locs.length > 0 || sublocs.length > 0) {
        return "False. I dont know what to do... it is so messy in my head";
    }
    if (items.length > 0 && chars.length === 0) {
        const itemID = items[0];
        if (actor.init_items.includes(itemID)) {
            return `False. I need to give ${itemID} to someone, but who to? I need to think fully....`;
        }
    }
    if (chars.length > 0) {
        const targetName = chars[0];
        const currentLoc = GameControl.current_location;
        const targetCharObj = findCharacterSafe(currentLoc, targetName);
        if (!targetCharObj) {
             return `False. ${targetName} is not here.`;
        }
        let itemID = null;
        if (items.length > 0) itemID = items[0];
        if (!itemID || !actor.init_items.includes(itemID)) {
            return `False. I think I dont have anything with me that I give to ${targetName}`;
        }
        const itemIndex = actor.init_items.indexOf(itemID);
        actor.init_items.splice(itemIndex, 1);
        targetCharObj.init_items.push(itemID);
        let reaction = "Thanks.";
        const giveReactions = targetCharObj.verbal_reactions?.["give"] || [];
        
        if (giveReactions.length > 0) {
            reaction = giveReactions[Math.floor(Math.random() * giveReactions.length)];
        } else {
            const fallback = targetCharObj.verbal_reactions?.["warm"] || ["Nodes respectfully."];
            reaction = fallback[0]; 
        }
        return `True. I gave ${itemID} to ${targetCharObj.name}. "${reaction}"`;
    }
    return "False. I need to know what and who.";
}


function consume_item(entities, actor) {
    //checking the items in inventory 
    const items = entities.item || [];
    let targetItemID = null;
    if (items.length > 0) {
        targetItemID = items[0];
    } else {
        return "False. Eat what? I need to specify the food.";
    }
    let itemSource = "inventory";
    let itemIndex = actor.init_items.indexOf(targetItemID);

    if (itemIndex === -1) {
        return `False. I don't have ${targetItemID} with me.`;
    }

    let foodItem = null;
    try { foodItem = new item(targetItemID); } catch(e) { return `False. I don't know what ${targetItemID} is.`; }

    if (foodItem.type !== "food" && foodItem.type !== "drink") {
        return `False. I can't eat or drink ${targetItemID}.`;
    }
    const nv = foodItem.NV || 0;
    actor.init_items.splice(itemIndex, 1);
    let restoreText = "";
    if (nv > 100) {
        actor.endurance = 100;
        actor.health = 100;
        restoreText = "I feel completely revitalized!";
    } else {
        actor.endurance = (actor.endurance || 0) + nv;
        if (actor.endurance > 100) actor.endurance = 100; 
        actor.health = (actor.health || 0) + nv; 
        if (actor.health > 100) actor.health = 100;  
        restoreText = `I feel better.`;
    }
    return `True. I consumed ${targetItemID}. ${restoreText}`;
}

function wear_item(entities, actor) {
    const items = entities.item || [];
    const chars = entities.characters || [];
    const currentLoc = GameControl.current_location;
    if (items.length === 0) {
        return "False. Wear what?";
    }
    const targetItemID = items[0];
    let targetCharObj = actor;
    let isTargetMe = true;
    if (chars.length > 0) {
        const charName = chars[0];
        if (charName.toLowerCase() !== "me") {
            const foundChar = findCharacterSafe(currentLoc, charName);
            if (!foundChar) {
                return `False. I can't dress ${charName} in ${targetItemID} though they might be nearby, I don't see them.`;
            }
            targetCharObj = foundChar;
            isTargetMe = false;
        }
    }
    let itemData = null;
    try {
        itemData = new item(targetItemID);
    } catch (e) {
        return `False. I don't know what ${targetItemID} is.`;
    }
    const validTypes = ["clothing", "comfort", "hygiene", "armor"];
    const validFuncs = ["wear", "warm", "equip"];
    const isValid = validTypes.includes(itemData.type) || validFuncs.includes(itemData.functionality);
    if (!isValid) {
        return "False. I can't dress anyone with that.";
    }
    let source = "none";
    let containerFound = null;
    if (actor.init_items.includes(targetItemID)) {
        source = "inventory";
    } 
    else if (currentLoc.sub_locations) {
        for (let subLoc of currentLoc.sub_locations) {
            const setId = subLoc.items_id;
            const itemSet = ITEMSdata.sets.find(s => s.id === setId);
            if (itemSet && itemSet.containers) {
                
                for (let contRef of itemSet.containers) {
                    const realContainer = ITEMSdata.containers.find(c => c.id === contRef.id);
                    if (realContainer && realContainer.items) {
                        const itemInCont = realContainer.items.find(it => it.id === targetItemID);
                        if (itemInCont) {
                            source = "environment";
                            containerFound = realContainer;
                            break;
                        }
                    }
                }
            }
            if (source === "environment") break;
        }
    }

    if (source === "none") {
        return `False. I don't have ${targetItemID} and I don't see it nearby.`;
    }


    if (source === "environment" && containerFound) {
        const idx = containerFound.items.findIndex(it => it.id === targetItemID);
        if (idx > -1) containerFound.items.splice(idx, 1);
    }
    if (source === "inventory" && !isTargetMe) {
        const idx = actor.init_items.indexOf(targetItemID);
        if (idx > -1) actor.init_items.splice(idx, 1);
    }

    if (!targetCharObj.init_items.includes(targetItemID)) {
        targetCharObj.init_items.push(targetItemID);
    }

    if (isTargetMe) {
        return `True. I have dressed the ${targetItemID}.`;
    } else {
        let reaction = "...";
        const warmReactions = targetCharObj.verbal_reactions?.["warm"] || [];
        
        if (warmReactions.length > 0) {
            reaction = warmReactions[Math.floor(Math.random() * warmReactions.length)];
        } else {
            reaction = "Thanks.";
        }
        
        return `True. ${reaction}`;
    }
}

function cut_item(entities, actor) {
    const items = entities.item || [];
    const chars = entities.characters || [];
    const cuttingTools = ["knife", "hunting_knife", "razor_blades", "keys"];
    const cuttableTypes = ["document", "junk", "food", "comfort", "clothing", "sentimental", "hygiene", "valuable"];

    if (items.length === 2 && chars.length === 0) {
        let toolID = items.find(id => cuttingTools.includes(id));
        let targetID = items.find(id => id !== toolID);

        if (!toolID) {
             return { 
                 success: false, 
                 text: `False. I think the ${items[1]} is impossible to cut with the ${items[0]}.` 
             };
        }

        if (!actor.init_items.includes(toolID)) {
            return {
                success: false,
                text: `False. I don't have the ${toolID} with me to cut anything.`
            };
        }

        let targetItemObj = null;
        try { targetItemObj = new item(targetID); } catch(e) { return { success: false, text: `False. I don't know what ${targetID} is.` }; }

        if (cuttableTypes.includes(targetItemObj.type)) {
            
            const lastLog = Logger.get_last_log();
            if (lastLog && 
               (lastLog.Command_formated.action === "inspect" || lastLog.Command_formated.action === "open")) {
                
                
                const currentLoc = GameControl.current_location;
                if (currentLoc.sub_locations) {
                    for (let subLoc of currentLoc.sub_locations) {
                        const set = ITEMSdata.sets.find(s => s.id === subLoc.items_id);
                        if (set && set.containers) {
                            
                            const containerWithItem = ITEMSdata.containers.find(c => c.items && c.items.some(it => it.id === targetID));
                            
                            if (containerWithItem) {
                                const itemIndex = containerWithItem.items.findIndex(it => it.id === targetID);
                                if (itemIndex > -1) {
                                    containerWithItem.items.splice(itemIndex, 1);
                                    return {
                                        success: true,
                                        text: `True. I looked at ${containerWithItem.id}. I took out my ${toolID} and cut the ${targetID}.`
                                    };
                                }
                            }
                        }
                    }
                }
            }
            if (actor.init_items.includes(targetID)) {
                return {
                    success: true,
                    text: `True. I took the ${targetID} out of my pocket and cut it using my ${toolID}.`
                };
            }
            return {
                success: false,
                text: `False. I don't see the ${targetID} here.`
            };
        } else {
             return {
                 success: false,
                 text: `False. I can't cut ${targetID}, it's too tough or useless to cut.`
             };
        }
    }

    if (items.length === 1 && chars.length === 1) {
        const toolID = items[0];
        const targetCharName = chars[0];
        if (!cuttingTools.includes(toolID)) {
             return {
                 success: false,
                 text: `False. I don't know whether it is possible to harm ${targetCharName} with ${toolID}.`
             };
        }
        if (!actor.init_items.includes(toolID)) {
             return {
                 success: false,
                 text: `False. I don't have ${toolID}.`
             };
        }
        const currentLocation = GameControl.current_location;
        const targetCharObj = findCharacterSafe(currentLocation, targetCharName);
        if (!targetCharObj) {
            return {
                success: false,
                text: `False. ${targetCharName} is not here.`
            };
        }
        let toolObj = null;
        try { toolObj = new item(toolID); } catch(e) { return { success: false, text: `False. I don't know what ${toolID} is.` }; }
        const damage = toolObj.HarmRate || 10;
        
        if (targetCharObj.health !== null) {
            targetCharObj.health -= damage;
            if (targetCharObj.health < 0) targetCharObj.health = 0;
        }

        let reaction = "...";
        const reactionsList = targetCharObj.verbal_reactions?.["cut"] || targetCharObj.verbal_reactions?.["attack"] || [];
        if (reactionsList.length > 0) {
             reaction = reactionsList[Math.floor(Math.random() * reactionsList.length)];
        }

        return {
            success: true,
            text: `True. I took my ${toolID} and stabbed ${targetCharObj.name}. "${reaction}"`
        };
    }

    return { success: false, text: "False. I need a tool and something to cut." };
}


function shoot_target(entities, actor) {
    const items = entities.item || [];
    const chars = entities.characters || [];

    let weaponID = items.find(id => {
        try { return new item(id).type === "weapon"; } catch (e) { return false; }
    });

    if (!weaponID) {
        weaponID = actor.init_items.find(id => {
            try { return new item(id).type === "weapon"; } catch (e) { return false; }
        });
    }

    if (!weaponID) {
        return { success: false, text: "False. I don't have a weapon to shoot with." };
    }

    if (!actor.init_items.includes(weaponID)) {
        return { success: false, text: `False. I don't have the ${weaponID} with me.` };
    }

    const weaponObj = new item(weaponID);

    
    if (chars.length > 0) {
        const targetName = chars[0];
        const currentLoc = GameControl.current_location;
        const targetChar = findCharacterSafe(currentLoc, targetName);

        if (!targetChar) {
            return { success: false, text: `False. ${targetName} is not here.` };
        }

        const damage = weaponObj.HarmRate || 30;
        if (targetChar.health !== null) {
            targetChar.health -= damage;
        }

        let reaction = "...";
        const reactionsList = targetChar.verbal_reactions?.["shoot"] || [];
        if (reactionsList.length > 0) {
            reaction = reactionsList[Math.floor(Math.random() * reactionsList.length)];
        }

        return {
            success: true,
            text: `True. I fired my ${weaponID} at ${targetChar.name}. "${reaction}"`
        };
    }

    const targetItemID = items.find(id => id !== weaponID);
    if (targetItemID) {
        if (!GameControl.shot_objects) GameControl.shot_objects = [];
        
        if (!GameControl.shot_objects.includes(targetItemID)) {
            GameControl.shot_objects.push(targetItemID);
        }

        return {
            success: true,
            text: `True. I shot the ${targetItemID}. It definitely has a hole in it now.`
        };
    }

    return { success: false, text: "False. Shoot at what?" };
}

function ignite_item(entities, intended_character) {
    const locs = [...(entities.location || []), ...(entities.sublocation || [])];
    const items = entities.item || [];
    const chars = entities.characters || [];

    if (items.length === 0 && chars.length === 0) {
        if (locs.length > 0) {
            return `False. I cant ignite ${locs[0]}.`;
        }
        return false;
    }

    const currentLocation = GameControl.current_location;

    if (items.length > 0) {
        const targetItemID = items[0];

        if (locs.length > 0) {
            const isCurrentLoc = locs.some(l => 
                l === currentLocation.location_id || 
                currentLocation.sub_locations.some(sub => sub.name === l || sub.tokens.includes(l))
            );

            if (!isCurrentLoc) {
                return "Ahh, i dont know what to do, i need to be more specific.";
            }
        }

        if (currentLocation && currentLocation.sub_locations) {
            for (let subLoc of currentLocation.sub_locations) {
                const setId = subLoc.items_id; 
                
                const itemSet = ITEMSdata.sets.find(s => s.id === setId);
                
                if (itemSet && itemSet.containers) {
                    
                    const containerDef = ITEMSdata.containers.find(c => c.items && c.items.some(it => it.id === targetItemID));
                    
                    if (containerDef) {
                        const containerInSetIndex = itemSet.containers.findIndex(c => c.id === containerDef.id);
                        
                        if (containerInSetIndex !== -1) {
                            const burnedContainer = itemSet.containers[containerInSetIndex];
                            itemSet.containers.splice(containerInSetIndex, 1);
                            
                            if (!GameControl.burning_objects) GameControl.burning_objects = [];
                            GameControl.burning_objects.push(burnedContainer.id);

                            return `I have ignited the ${targetItemID} inside the ${burnedContainer.id}. The fire spread quickly, destroying everything inside.`;
                        }
                    }
                }
            }
        }

        if (intended_character && intended_character.init_items) {
            const itemIndex = intended_character.init_items.indexOf(targetItemID);
            if (itemIndex !== -1) {
                intended_character.init_items.splice(itemIndex, 1);
                return `I have ignited the ${targetItemID}.`;
            }
        }

        return "But i dont have this one near or with me...";
    }

    if (chars.length > 0) {
        const targetCharName = chars[0];
        const targetCharObj = findCharacterSafe(currentLocation, targetCharName);

        if (!targetCharObj) {
            return `Looks like i am going nuts, why am i thinking of ${targetCharName}? No one with this name near me..`;
        }

        if (targetCharObj.health) {
            targetCharObj.health -= 50;
            if (targetCharObj.health < 0) targetCharObj.health = 0;
        }

        let reaction = "...";
        if (targetCharObj.verbal_reactions) {
             
             const reactionsList = targetCharObj.verbal_reactions["ignite"] || targetCharObj.verbal_reactions["attack"];
             if (reactionsList && reactionsList.length > 0) {
                 reaction = reactionsList[0];
             } else {
                 reaction = "AAAAHH!!!";
             }
        }

        return `True. You set ${targetCharObj.name} on fire! They screamed: "${reaction}"`;
    }
    return false;
}
function attack_target(entities = [], actor) {
    const chars = entities.characters || [];
    const items = entities.item || [];
    if (chars.length === 2) {
        return "False. I have only two arms...";
    }
    if (chars.length === 1 && items.length === 1) {
        const targetName = chars[0];
        const weaponId = items[0];
        const currentLocation = GameControl.current_location;
        const targetChar = findCharacterSafe(currentLocation, targetName);
        if (!targetChar) {
            return "False. He is not here... I'd better drink some water.";
        }
        if (!actor.init_items.includes(weaponId)) {
            return `False. I don't have the ${weaponId} with me.`;
        }
        let weaponObj = null;
        try { weaponObj = new item(weaponId); } catch(e) { return `False. I don't know what ${weaponId} is.`; }
        if (weaponObj.type === "weapon") {   
            const damage = weaponObj.HarmRate || 0;
            if (targetChar.health !== null) {
                targetChar.health -= damage;
            }
            let reactionText = "...";
            const reactions = targetChar.verbal_reactions?.["attack"] || [];
            
            if (reactions.length > 0) {
                const limit = Math.min(reactions.length, 2);
                const randomIndex = Math.floor(Math.random() * limit);
                reactionText = reactions[randomIndex];
            }

            let output = `True. I attacked ${targetChar.name} with ${weaponId} and caused them merciless pain. 
            
            ${targetChar}:"${reactionText}"`;

            if (targetChar.health <= 0) {
                const index = currentLocation.characters.indexOf(targetChar);
                if (index > -1) {
                    currentLocation.characters.splice(index, 1);
                }
                output += ` ${targetChar.name} falls to the ground, motionless.`;
            }
            return output;
        } else {
            return `False. Using ${weaponId} as a weapon is not a good idea.`;
        }
    }
    return "False. I have to decide who to attack and how... Yet it doesn't make sense...";
}
function go_to(entities, actor) {
    //cheching avalable locations and sublocations
    const locs = [...(entities.location || []), ...(entities.sublocation || [])];
    const items = entities.item || [];
    const chars = entities.characters || [];
    // hahaha if there are items or characters, i will not go anywhere thats a noncense
    if (items.length > 0 || chars.length > 0) {
        return "False. I dont know what to do.... Inhale, Exhale... i have to keep concioousness....";
    }
    if (locs.length === 0) {
        return "False. Go where?";
    }

    const currentLocObj = GameControl.current_location;
    const currentLocID = currentLocObj.location_id;
    const currentSubLocID = GameControl.active_sub_location || null; 

    const describeAndReturn = (subLocObj, locObj) => {
        const text = location_descr_generator(subLocObj, locObj || currentLocObj);
        return text ? `True. ${text}` : "True.";
    };

    const setLocation = (locId) => {
        const newLoc = new location(locId);
        if (newLoc.characters && Array.isArray(newLoc.characters)) {
            newLoc.characters = newLoc.characters.map(name => new character(name));
        }
        GameControl.current_location = newLoc;
        const firstSub = newLoc.sub_locations?.[0];
        GameControl.active_sub_location = firstSub?.name || null;
        if (firstSub) {
            return describeAndReturn(firstSub, newLoc);
        }
        const baseText = `I am now in ${prettifyName(newLoc.location_n || locId)}`;
        return `True. ${baseText}.`;
    };

    const moveSceneLocation = () => {
        const sceneLocs = GameControl?.scene?.scene_locations;
        if (!sceneLocs || !Array.isArray(sceneLocs)) return "False. I am lost.";
        const currentIndex = sceneLocs.findIndex(l => l.location_id === currentLocID);   
        if (currentIndex === -1) return "False. I am lost.";
        let nextIndex = currentIndex + 1;
        if (nextIndex >= sceneLocs.length) {
            nextIndex = currentIndex - 1;
        }
        if (nextIndex < 0) {
            return "False. There is nowhere else to go.";
        }
        return setLocation(sceneLocs[nextIndex].location_id);
    };

    const moveToSubLocation = (target) => {
        if (!currentLocObj?.sub_locations) return null;
        const subLocObj = currentLocObj.sub_locations.find(sub => 
            sub.name === target || (sub.tokens && sub.tokens.some(t => target.includes(t) || t.includes(target)))
        );
        if (!subLocObj) return null;
        GameControl.active_sub_location = subLocObj.name;
        return describeAndReturn(subLocObj, currentLocObj);
    };

    if (locs.length === 2) {
        const isLoc0_Current = (locs[0] === currentLocID || locs[0] === currentSubLocID);
        const isLoc1_Current = (locs[1] === currentLocID || locs[1] === currentSubLocID);
        if (!isLoc0_Current && !isLoc1_Current) {
            return "False. I am not near any of these places.";
        }
        const target = isLoc0_Current ? locs[1] : locs[0];
        if (target.includes("exit") || target === "exit") {
             return moveSceneLocation();
        }
        const subMove = moveToSubLocation(target);
        if (subMove) {
            return subMove;
        }  
        const sceneLocs = GameControl?.scene?.scene_locations || [];
        const isSceneLoc = sceneLocs.some(l => l.location_id === target);  
        if (isSceneLoc) {
             if (target === currentLocID) {
                 GameControl.active_sub_location = null;
                 const firstSub = currentLocObj.sub_locations?.[0];
                 return describeAndReturn(firstSub, currentLocObj);
             } else {
                 return setLocation(target);
             }
        }

        return "False. I can't go there from here.";
    }
    if (locs.length === 1) {
        const target = locs[0];
        if (target.includes("exit") || target === "exit") {
             return moveSceneLocation();
        }
        const subMove = moveToSubLocation(target);
        if (subMove) {
            return subMove;
        }
        if (target === currentLocID || currentLocObj.location_n === target) {
            GameControl.active_sub_location = null;
            const firstSub = currentLocObj.sub_locations?.[0];
            return describeAndReturn(firstSub, currentLocObj);
        }
        const sceneLocs = GameControl?.scene?.scene_locations || [];
        if (sceneLocs.some(l => l.location_id === target)) {
            return setLocation(target);
        }
        return "False. I don't see that place here.";
    }
    return "False. Go where?";
}


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
    const targetChar = findCharacterSafe(currentLoc, targetName);
    
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

function update_hunger_state() {
    const actor = GameControl?.player;
    if (!actor || actor.endurance === null) return "";
    
    let report = "";
    actor.endurance -= 3;
    
    if (actor.endurance <= 30 && actor.endurance > 10) {
        report = "My stomach is growling... I should find some food.";
    } else if (actor.endurance <= 10 && actor.endurance > 0) {
        report = "I am feeling weak from hunger.";
    } else if (actor.endurance <= 0) {
        actor.endurance = 0;
        if (actor.health !== null) {
            actor.health -= 5;
            report = "I am starving... my health is deteriorating.";
            if (actor.health <= 0) {
                actor.health = 0;
                report += " I have collapsed from starvation.";
            }
        }
    }
    return report;
}

function open_item(entities, actor) {
    const items = entities.item || [];
    if (items.length === 0) return "False. Open what?";
    return `True. I opened the ${items[0]}. It's empty.`;
}

// This function will figure out what to do next
export function action_identifier(intent_object = AP_operator.Aintent, entities = AP_operator.entities){
  const actor = GameControl?.player ?? GameControl?.getChar?.("Me") ?? { name: "Me", init_items: [], health: 100, verbal_reactions: {}, endurance: 70 };
  let result = null;
  let logStatus = {};
  
  const isSuccess = (val) => typeof val === 'string' && val.startsWith("True");
  const safeReason = (val) => typeof val === 'string' ? val : (val?.text ?? String(val ?? "Unknown"));

  switch(intent_object){
    case "ignite": {
        const res = ignite_item(entities, actor);
        result = typeof res === 'string' ? res : safeReason(res);
        logStatus = { success: isSuccess(result), reason: result };
        break;
    }
    case "attack": {
        const res = attack_target(entities, actor);
        result = typeof res === 'string' ? res : safeReason(res);
        logStatus = { success: isSuccess(result), reason: result };
        break;
    }
    case "go": {
        const res = go_to(entities, actor);
        result = typeof res === 'string' ? res : safeReason(res);
        logStatus = { success: isSuccess(result), reason: result };
        break;
    }
    case "cut": {
        const resObj = cut_item(entities, actor);
        result = resObj?.text ?? safeReason(resObj);
        logStatus = { success: resObj?.success ?? isSuccess(result), reason: result };
        break;
    }
    case "eat": 
    case "drink": {
        const res = consume_item(entities, actor);
        result = typeof res === 'string' ? res : safeReason(res);
        logStatus = { success: isSuccess(result), reason: result };
        break;
    }
    case "shoot": {
        const resObj = shoot_target(entities, actor);
        result = resObj?.text ?? safeReason(resObj);
        logStatus = { success: resObj?.success ?? isSuccess(result), reason: result };
        break;
    }
    case "wear": {
        const res = wear_item(entities, actor);
        result = typeof res === 'string' ? res : safeReason(res);
        logStatus = { success: isSuccess(result), reason: result };
        break;
    }
    case "give": {
        const res = give_item(entities, actor);
        result = typeof res === 'string' ? res : safeReason(res);
        logStatus = { success: isSuccess(result), reason: result };
        break;
    }
    
    case "inspect": {
        const res = inspect_item(entities, actor);
        result = typeof res === 'string' ? res : safeReason(res);
        logStatus = { success: isSuccess(result), reason: result };
        break;
    }
    case "unlock": {
        const res = unlock_item(entities, actor);
        result = typeof res === 'string' ? res : safeReason(res);
        logStatus = { success: isSuccess(result), reason: result };
        break;
    }
    case "sit": {
        const res = sit_action(entities, actor);
        result = typeof res === 'string' ? res : safeReason(res);
        logStatus = { success: isSuccess(result), reason: result };
        break;
    }
    case "pickup": {
        const res = pickup_item(entities, actor);
        result = typeof res === 'string' ? res : safeReason(res);
        logStatus = { success: isSuccess(result), reason: result };
        break;
    }
    case "punch": {
        const res = punch_target(entities, actor);
        result = typeof res === 'string' ? res : safeReason(res);
        logStatus = { success: isSuccess(result), reason: result };
        break;
    }
    case "throw":
    case "put":
    case "store_items": {
        const res = throw_item(entities, actor);
        result = typeof res === 'string' ? res : safeReason(res);
        logStatus = { success: isSuccess(result), reason: result };
        break;
    }
    case "open": {
        const res = open_item(entities, actor);
        result = typeof res === 'string' ? res : safeReason(res);
        logStatus = { success: isSuccess(result), reason: result };
        break;
    }
    case "hook":
    case "signal":
        result = "True. I did the action, but nothing happened.";
        logStatus = { success: true, reason: "Fallback logic applied" };
        break;
    default:
        result = false;
        logStatus = { success: false, reason: "Unknown intent" };
  }

  if (result && typeof result === 'string' && !result.startsWith("False")) {
      const currentLoc = GameControl.current_location;
      
      if (currentLoc && currentLoc.characters) {
          for (let i = currentLoc.characters.length - 1; i >= 0; i--) {
              const char = currentLoc.characters[i];
              
              if (char.name !== "Me") {
                  if (char.health !== null && char.health <= 0) {
                      currentLoc.characters.splice(i, 1);
                      
                      result += ` ${char.name} falls to the ground, motionless. They are dead.`;
                      
                      if (logStatus) logStatus.death = char.name;
                  }
              }
          }
      }
  }
  //every time i update hunger state, i will add it to the result
  if (intent_object) {
      const hungerReport = update_hunger_state();
      
      if (hungerReport && hungerReport.length > 0) {
          if (result === false) result = "I couldn't do that, but time passes...";
          result = result + "\n\n" + hungerReport;
      }
  }

  if (result) {
    // logging impossible actions  
    Logger.add_log({
          command_raw: AP_operator.RawTXT || "Unknown command",
          command_formatted: { 
              action: intent_object, 
              entity: entities 
          },
          status: logStatus
      });
  }
  return result;
}

// RawTXT = the raw text input from the user
// PurePMT = the processed intent and entities from the text input
// entities = array of entities extracted from the text input
// intent => the main intent extracted from text input
class task_processor{
    constructor(RawTXT = null, PurePMT = null, entities=[], intent=null){
        this.RawTXT = RawTXT;
        this.PurePMT = PurePMT;
        this.Aintent = intent;
        this.entities = entities
    }
    async main(input) {
        if (!input || typeof input !== "string") {
            return null;
        }
        try {
            //sending a server request to local Flask server for NLP parsing
            const response = await fetch("http://localhost:5005/parse", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ text: input })
            });
            
            if (!response.ok) {
                 throw new Error("Server response not ok");
            }
            
            const data = await response.json();
            const intentName = data?.action ?? null;
            const confidence = 1.0; // The Flask API doesn't expose confidence currently
            this.Aintent = intentName;
            this.confidence = confidence;
            
            // Note: semantic_parser handles entities, but if we wanted to read Rasa's entities:
            // this.rasaEntities = data; 
            
            return {
                intent: intentName,
                confidence
            };
        } catch (error) {
            console.warn(
                "[action_engine] Rasa unavailable, using fallback.",
                error
            );
            this.Aintent = inpsample.intent.name;
            this.entities = inpsample.entities;
            return {
                intent: inpsample.intent.name,
                confidence: inpsample.intent.confidence ?? 0
            };
        }
    }
    get_entities(text){
      const tokens = tokenized(text);
      if (!tokens || tokens.length === 0) {
          this.entities = { location: [], sublocation: [], item: [], characters: [] };
      } else {
          this.entities = match_items(tokens);
      }
      return this.entities;
    }
}

export async function textprocess(text){
  if (!text) {
    return null;
  }
  AP_operator.RawTXT = text.trim()
  AP_operator.PurePMT = await AP_operator.main(AP_operator.RawTXT)
  AP_operator.get_entities(AP_operator.RawTXT)
  return AP_operator.PurePMT
}

// AP_operator is an instance of task_processor
const AP_operator = new task_processor()
