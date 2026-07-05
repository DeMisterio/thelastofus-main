import { character, location, item, scenes, loadJSONData, ITEMSdata, SCENEdata, GameControl, setGameControl } from './entity_system/entity_init/objective_export.js'
import { send_text, get_user_input_async } from '../effect_control.js'
import { HelloWorld as DisplayIntroText } from '../script.js'
import { textprocess, action_identifier } from './action_control/action_engine.js'

export class GameState {

    constructor(scene, current_location, hint_list = []) {
        this.scene = scene
        this.current_location = current_location
        this.hint_list = hint_list
        this.active_sub_location = null;
        try {
            this.player = new character("Me");
        } catch(e) {
            console.error("Failed to initialize player:", e);
            this.player = { name: "Me", init_items: [], health: 100, verbal_reactions: {} }; 
        }
    }
    
    getChar(name) {
        if (!name) return null;
        if (name.toLowerCase() === 'me' && this.player) return this.player;
        
        try {
            return new character(name);
        } catch (e) {
            console.warn(`Could not load character preset for ${name}, using fallback.`);
            return { name: name, init_items: [], health: 100, verbal_reactions: {} };
        }
    }
}
const SceneLogic = {
    1: function() {
        // Scene 1 completes when the player decides to go to the hall.
        return GameControl && GameControl.active_sub_location === 'hall';
    }
};

function checkSceneCompletion(sceneObj) {
    if (!sceneObj || !sceneObj.on_complete) return false;
    
    // Check location based completion
    if (sceneObj.on_complete.location) {
        let reqLocs = sceneObj.on_complete.location;
        if (GameControl && GameControl.current_location) {
            let currentId = GameControl.current_location.location_id;
            return reqLocs.includes(currentId);
        }
    }
    
    // Check branch based completion
    if (sceneObj.on_complete.branch) {
        // For branched completion, typically we require a specific action or event. 
        // For now, if the player reaches the next branch location, we handle it.
        // We'll leave it simple for testing.
    }
    
    return false;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function out_scene_text() {
    if (!scene || !scene.scene_texts) {
        return;
    }
    
    if (scene.scene_title) {
        send_text(`\n=== ${scene.scene_title} ===\n`);
        await sleep(1000);
    }
    
    const globalObj = typeof window !== "undefined" ? window : globalThis;
    globalObj.skipText = false;
    
    for (let text = 0; text < scene.scene_texts.length; text++) {
        send_text(scene.scene_texts[text].text);
        if (!globalObj.skipText) {
            await sleep(1000 * (scene.scene_texts[text].weight || 1));
        }
    }
    
    globalObj.skipText = false;
}
function isGarbage(input) {
    //i check if the input is rubbish or nonsense
    if (!input) return true;
    const text = input.trim().toLowerCase();
    if (text.length < 2) return true;
    const words = text.split(/\s+/);
    const specialRatio = (text.match(/[^a-z0-9\s]/gi)?.length || 0) / text.length;
    if (specialRatio > 0.4) return true;
    const allShort = words.every(w => w.length <= 3);
    const allNoVowels = words.every(w => !/[aeiou]/i.test(w));

    if (allShort && allNoVowels) return true;
    const repeatedSyllable = words.every(
        w => /^([bcdfghjklmnpqrstvwxyz]{1,2}[aeiou]){1,2}$/i.test(w)
    );
    if (repeatedSyllable && words.length >= 2) return true;
    const tooManyClusters = words.every(w => /[bcdfghjklmnpqrstvwxyz]{3,}/i.test(w));
    if (tooManyClusters) return true;

    return false;
}


const isWhitespaceString = str => {
    if (!str || typeof str !== 'string') return true;
    return !str.replace(/\s/g, '').length;
}


async function get_content() {
    let content = await get_user_input_async();
    if (!content) {
        content = '';
    }
    //Pnunishment for nonsense inputs
    let abuse_counter = 0;
    while (isWhitespaceString(content) || isGarbage(content)) {
        content = await get_user_input_async();
        if (!content) {
            content = '';
        }
        abuse_counter += 1
        if (abuse_counter > 5) {
            if (GameControl && GameControl.hint_list && GameControl.hint_list.includes('abuse_hint')) {
                send_text("My head... something feels wrong. The words you force me to say dont make logical sence... I feel I am losing myself!!")
            } else {
                if (GameControl) {
                    GameControl.hint_list.push('abuse_hint')
                }
                send_text('[ HINT - SAYING NONCES MAKES THE KEY CHARACTER TO GO NUTS AND LOOSE HIS HEALTH. ]')
            }
        } else if (abuse_counter > 15) {
            send_text("ITS TERRIBLE! SOMEONE HELP ME!!")
        } else {
        }
    }
    abuse_counter = 0
    return content

}

function prettifyName(raw) {
    if (!raw) return '';
    return raw.toString().replace(/_/g, ' ');
}

export function location_descr_generator(subLocationInput, locationObj = GameControl?.current_location) {
    const activeLocation = locationObj || GameControl?.current_location;
    let subLocation;
    
    if (subLocationInput) {
        subLocation = typeof subLocationInput === 'string'
            ? activeLocation?.sub_locations?.find(sl => sl.name === subLocationInput)
            : subLocationInput;
    } else {
        const activeSubName = GameControl?.active_sub_location;
        if (activeSubName) {
            subLocation = activeLocation?.sub_locations?.find(sl => sl.name === activeSubName);
        } else {
            subLocation = activeLocation?.sub_locations?.[0];
        }
    }

    if (!subLocation) {
        return `I look around ${prettifyName(activeLocation?.location_id || 'this place')} but there's not much to see.`;
    }

    const initDescription = subLocation.init_description || `I am currently looking around the ${prettifyName(subLocation.name)}`;
    const itemsSet = ITEMSdata?.sets?.find(set => set.id === subLocation.items_id);
    const containers = itemsSet?.containers || [];
    
    // Process containers
    const containerNames = containers.map(cont => prettifyName(cont.id)).filter(Boolean);
    let containerText = '';
    if (containerNames.length === 1) {
        containerText = `a ${containerNames[0]}`;
    } else if (containerNames.length > 1) {
        const lastContainer = containerNames.pop();
        containerText = `${containerNames.join(', ')} and a ${lastContainer}`;
    }

    // Process visible items on surfaces
    const surfaceContainers = containers.filter(cont => cont.verbs?.some(v => v === 'on the' || v === 'under the'));
    const itemPhrases = [];
    for (const cont of surfaceContainers) {
        const verb = cont.verbs.find(v => v === 'on the' || v === 'under the') || cont.verbs?.[0] || '';
        const baseContainer = ITEMSdata?.containers?.find(c => c.id === cont.id);
        const items = baseContainer?.items || [];
        if (!items.length) continue;
        const itemNames = items.map(it => prettifyName(it.name || it.id)).filter(Boolean);
        if (!itemNames.length) continue;
        
        let itemNamesText = itemNames.length > 1 
            ? `${itemNames.slice(0, -1).join(', ')} and ${itemNames[itemNames.length - 1]}`
            : itemNames[0];
            
        itemPhrases.push(`some ${itemNamesText} ${verb} ${prettifyName(cont.id)}`);
    }

    // Process characters
    const characters = (activeLocation?.characters || []).filter(ch => {
        if (!ch) return false;
        if (typeof ch === 'string') return true;
        if (typeof ch.health === 'number') return ch.health > 0;
        return true;
    }).map(ch => typeof ch === 'string' ? prettifyName(ch) : prettifyName(ch.name));

    let characterText = '';
    if (characters.length === 1) {
        characterText = `I can see ${characters[0]} here as well.`;
    } else if (characters.length > 1) {
        const lastChar = characters.pop();
        characterText = `I can see ${characters.join(', ')} and ${lastChar} here.`;
    } else {
        characterText = "It seems I am alone here.";
    }

    // Combine everything into a nice paragraph
    let finalDesc = `${initDescription}.`;
    
    if (containerText) {
        finalDesc += ` Around me, I notice ${containerText}.`;
    } else {
        finalDesc += ` There isn't much to interact with around here.`;
    }
    
    if (itemPhrases.length > 0) {
        finalDesc += ` Looking closer, I spot ${itemPhrases.join('; ')}.`;
    }
    
    finalDesc += ` ${characterText}`;

    return finalDesc;
}

// Advance to the next scene function (goes forward in the scene sequence)
async function advanceToNextScene() {
    const nextScene = scene.getNextScene();
    if (!nextScene) {
        send_text("End of game reached.");
        Gameloop = false;
        return false;
    }
    
    scene = nextScene;
    sceneTextDisplayed = false;
    
    if (scene.scene_locations && scene.scene_locations.length > 0) {
        let loc = new location(scene.scene_locations[0].location_id);
        
        if (loc.characters && Array.isArray(loc.characters)) {
            loc.characters = loc.characters.map(name => new character(name));
        }
        
        GameControl.current_location = loc;
    }
    
    return true;
}

function updateUI() {
    // 1. Update Inventory
    const inventoryDiv = document.getElementById('inventoryItems');
    if (inventoryDiv && GameControl && GameControl.player) {
        let itemsHTML = '';
        if (GameControl.player.init_items.length === 0) {
            itemsHTML = '<span style="color: #888; font-size: 14px;">Empty</span>';
        } else {
            GameControl.player.init_items.forEach(item => {
                itemsHTML += `<div class="inventory-pill">${item.replace(/_/g, ' ')}</div>`;
            });
        }
        inventoryDiv.innerHTML = itemsHTML;
    }

    // 2. Update Progress Sidebar
    const scenariosDiv = document.getElementById('scenarioList');
    if (scenariosDiv && GameControl && scene && SCENEdata) {
        let scenariosHTML = '';
        const currentSceneN = scene.scene_n;
        const allScenes = SCENEdata.scenes;
        
        // Remove duplicates if they have the same scene_n (like 6A and 6B)
        const uniqueScenes = [];
        const seenN = new Set();
        allScenes.forEach(s => {
            if (!seenN.has(s.scene_n)) {
                seenN.add(s.scene_n);
                uniqueScenes.push(s);
            }
        });

        uniqueScenes.forEach(s => {
            const isPast = s.scene_n < currentSceneN;
            const isCurrent = s.scene_n === currentSceneN;
            const isFuture = s.scene_n > currentSceneN;

            let extraClass = '';
            let lockIconHTML = '';
            
            if (isCurrent) extraClass = 'active';
            if (isFuture) {
                extraClass = 'locked';
                lockIconHTML = '<div class="lock-icon">🔒</div>';
            }

            scenariosHTML += `
                <div class="scene-wrapper">
                    <div class="scene-card ${extraClass}">
                        ${isPast ? '✓ ' : ''} Scene ${s.scene_n}: ${s.scene_title}
                    </div>
                    ${lockIconHTML}
                </div>
            `;
        });
        
        scenariosDiv.innerHTML = scenariosHTML;
    }
}

async function gameprocess() {
    updateUI();
    while (Gameloop === true) {
        if (!sceneTextDisplayed) {
            await out_scene_text();
            sceneTextDisplayed = true;
            updateUI(); // update UI after text finishes
        }
        const sceneNum = scene.scene_n;
        let sceneComplete = false;
        if (SceneLogic[sceneNum]) {
            const logicResult = SceneLogic[sceneNum]();
            sceneComplete = logicResult instanceof Promise ? await logicResult : logicResult;
        }
        
        if (!sceneComplete) {
            sceneComplete = checkSceneCompletion(scene);
        }
           
        if (sceneComplete) {
            const advanced = await advanceToNextScene();
            if (!advanced) {
                break;
            }
            continue;
        }    
        let content = await get_content();
        
        try {
            let processed = await textprocess(content);
            if (processed && processed.intent) {
                let actionText = action_identifier(processed.intent);
                if (actionText) {
                    send_text(actionText);
                } else {
                    send_text("I didn't understand that.");
                }
            } else {
                send_text(`I didn't understand that.`);
            }
            updateUI(); // Refresh UI after taking action
        } catch (e) {
            console.error("Error processing action", e);
            send_text("I am too confused right now. (Engine Error)");
        }
    }
}


let scene = null;

let Gameloop = false;
let sceneTextDisplayed = false;

export async function HelloWorld(sceneObj) {
    if (!sceneObj || !sceneObj.scene_texts) {
        return;
    }
    for (let textObj of sceneObj.scene_texts) {
        send_text(textObj.text);
        await sleep(1000 * (textObj.weight || 1));
    }
}

export async function initializeGame() {
    try {
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', resolve);
                } else {
                    resolve();
                }
            });
        }  
        const outputElement = document.getElementById('output');
        if (!outputElement) {
            throw new Error("Output element not found in DOM");
        }  
        const dataLoaded = await loadJSONData();
        if (!dataLoaded) {
            throw new Error("Failed to load game data");
        }      
        scene = new scenes(1, 1);

let loc = new location(
            scene.scene_locations[0].location_id
        );
        if (loc.characters && Array.isArray(loc.characters)) {
            loc.characters = loc.characters.map(name => new character(name));
        }

console.log(loc.characters);
        setGameControl(new GameState(scene, loc));  
        sceneTextDisplayed = false; 
        try {
            console.log("Displaying intro text...");
            await DisplayIntroText();
            console.log("Intro text displayed successfully");
        } catch (introError) {
            console.error("Error displaying intro text:", introError);
            send_text("Error displaying intro text: " + introError.message);
        }
        Gameloop = true;
        gameprocess();
    } catch (error) {
        console.error("Error initializing game:", error);
        send_text("Error initializing game: " + error.message);
    }
}


