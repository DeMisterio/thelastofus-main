// JSON data will be loaded asynchronously
export let SCENEdata = null;
export let LOCATIONdata = null;
export let CHARACTERdata = null;
export let ITEMSdata = null;
export let entity_data_base = null;
export let GameControl = null;

export function setGameControl(gc) {
    GameControl = gc;
}

// Load JSON files (for browser environment)
async function loadJSONData() {
    try {
        const globalWindow = typeof window !== 'undefined' ? window : null;
        const basePath = (globalWindow && globalWindow.location.pathname.includes('Game_Visual')) ? '../' : './';
        const [scenesRes, locationsRes, charactersRes, itemsRes] = await Promise.all([
            fetch(`${basePath}event_control/entity_system/entities/scenes/scenes.json`),
            fetch(`${basePath}event_control/entity_system/entities/locations/location.json`),
            fetch(`${basePath}event_control/entity_system/entities/Characters/characters.json`),
            fetch(`${basePath}event_control/entity_system/entities/items/items.json`)
        ]);
        // i used fetch instead of import to avoid issues with dynamic imports in some environments and avoid browser errors
        
        SCENEdata = await scenesRes.json();
        LOCATIONdata = await locationsRes.json();
        CHARACTERdata = await charactersRes.json();
        ITEMSdata = await itemsRes.json();
        
        entity_data_base = typisation_init();
        
        return true;
    } catch (error) {
        console.error("Error loading JSON data:", error);
        // If fails, try to load from Node.js environment manuallywith readFileSync function (risky but works in some cases)
        try {
            const fs = await import("fs");
            SCENEdata = JSON.parse(fs.readFileSync("event_control/entity_system/entities/scenes/scenes.json", "utf-8"));
            LOCATIONdata = JSON.parse(fs.readFileSync("event_control/entity_system/entities/locations/location.json", "utf-8"));
            CHARACTERdata = JSON.parse(fs.readFileSync("event_control/entity_system/entities/Characters/characters.json", "utf-8"));
            ITEMSdata = JSON.parse(fs.readFileSync("event_control/entity_system/entities/items/items.json", "utf-8"));
            entity_data_base = typisation_init();
            return true;
        } catch (nodeError) {
            console.error("Error loading JSON data (Node.js fallback):", nodeError);
            return false;
        }
    }
}

// i am exporting loadJSONData so it can be called from event_control.js
export { loadJSONData };

export class scenes {
    constructor(scene_n, scene_id = null) {
        if (!SCENEdata || !SCENEdata.scenes) {
            throw new Error("SCENEdata not loaded yet. Call loadJSONData() first.");
        }
        
        let scene = null;
        if (scene_id !== null) {
            scene = SCENEdata.scenes.find(st => st.scene_id === scene_id);
        } else {
            scene = SCENEdata.scenes.find(st => st.scene_n === scene_n);
        }
        if (!scene) {
            throw new Error(`Scene not found: scene_n=${scene_n}, scene_id=${scene_id}`);
        }
        this.scene_id = scene.scene_id;
        this.scene_n = scene.scene_n;
        this.scene_title = scene.scene_title;
        this.scene_locations = scene.locations;
        this.scene_texts = scene.intro_text;
        this.on_complete = scene.on_complete || null;
    }
    //get next scene based on current scene_n (not really used in game, but can be useful for testing)
    getNextScene() {
        if (!SCENEdata || !SCENEdata.scenes) {
            return null;
        }
        const next = SCENEdata.scenes.find(st => st.scene_n === this.scene_n + 1);
        if (!next) return null;
        return new scenes(next.scene_n, next.scene_id);
    }
}
//typisation_init function creates a database of entities based on the provided data, in our case LOCATIONdata, CHARACTERdata and ITEMSdata

export function typisation_init(locData = null, charData = null, itemData = null){
    const locDataToUse = locData || LOCATIONdata;
    const charDataToUse = charData || CHARACTERdata;
    const itemDataToUse = itemData || ITEMSdata;
    
    if (!locDataToUse || !charDataToUse || !itemDataToUse) {
        console.warn("Missing data for typisation_init");
        return {};
    }
    
    let entity_db = {}
    let location_db = {}
    let sublocation_db = {}
    
    // Process locations
    if (locDataToUse.locations && Array.isArray(locDataToUse.locations)) {
        for (let i = 0; i < locDataToUse.locations.length; i++) {
            const loc = locDataToUse.locations[i];
            location_db[loc.id] = loc.tokens;
            if (loc.sub_locations && Array.isArray(loc.sub_locations)) {
                for (let z = 0; z < loc.sub_locations.length; z++) {
                    const sub = loc.sub_locations[z]
                    sublocation_db[sub.name] = sub.tokens
                }
            }
        }
    }
    
    // Process characters
    let characters_db = {}
    if (charDataToUse.characters && Array.isArray(charDataToUse.characters)) {
        for (let i = 0; i < charDataToUse.characters.length; i++) {
            characters_db[charDataToUse.characters[i].character_n] = charDataToUse.characters[i].tokens
        }
    }
    
    // Process items
    let items_db = {}
    
    if (itemDataToUse.containers && Array.isArray(itemDataToUse.containers)) {
        for (let i = 0; i < itemDataToUse.containers.length; i++) {
            const c = itemDataToUse.containers[i]
            items_db[c.id] = c.tokens
        }
    }
    
    if (itemDataToUse.items && Array.isArray(itemDataToUse.items)) {
        for (let i = 0; i < itemDataToUse.items.length; i++) {
            const it = itemDataToUse.items[i]
            items_db[it.id] = it.tokens
        }
    }
    
    entity_db["location"] = location_db
    entity_db["sublocation"] = sublocation_db
    entity_db["characters"] = characters_db
    entity_db['item'] = items_db
    
    // Fallbacks just in case
    entity_db["locations"] = location_db
    entity_db['items'] = items_db
    
    return entity_db
}


//lesson: the private variables in a class (hashtag thing)
//its just a way to make sure that the variable is not accessible from outside the class


export class character {
    #name;
    #character_type;
    #personality;
    #init_parameters;
    #verbal_reactions
    constructor(preseted = null, name = null, character_type = null, personality = null, init_parameters = null) {
        if (!CHARACTERdata || !CHARACTERdata.characters) {
            throw new Error("CHARACTERdata not loaded yet. Call loadJSONData() first.");
        }
        
        this.preseted = preseted;

        if (this.preseted !== null) {
            const presetData = CHARACTERdata.characters.find(ch => ch.character_n === this.preseted);
            if (!presetData) {
                throw new Error(`Character preset not found: ${this.preseted}`);
            }
            this.#name = presetData.character_n;
            this.#character_type = presetData.character_type;
            this.#personality = presetData.personality;
            this.#init_parameters = presetData.init_parameters;
            this.#verbal_reactions = presetData.verbal_reactions;
        } else {
            this.#name = name;
            this.#character_type = character_type;
            this.#personality = personality;
            this.#init_parameters = init_parameters || [];
        }
        
        // Extract parameters from init_parameters array
        if (this.#init_parameters && Array.isArray(this.#init_parameters)) {
            this.health = this.#init_parameters[0]?.health ?? null;
            this.action_speed = this.#init_parameters[1]?.action_speed ?? null;
            this.endurance = this.#init_parameters[2]?.endurance ?? null;
            this.strength = this.#init_parameters[3]?.strength ?? null;
            this.init_items = this.#init_parameters[4]?.init_items ?? [];
        } else {
            this.health = null;
            this.action_speed = null;
            this.endurance = null;
            this.strength = null;
            this.init_items = [];
        }
    }
    get name() {
        return this.#name;
    }
    get character_type() {
        return this.#character_type;
    }

    get personality() {
        return this.#personality;
    }

    get init_parameters() {
        return this.#init_parameters;
    }
    get verbal_reactions() {
        return this.#verbal_reactions;
    }
    //hate thing that i have to use this, but its a workaround for the fact that i cannot use getters in the constructor
}

export class location {
    constructor(location_id) {
        if (!LOCATIONdata || !LOCATIONdata.locations) {
            throw new Error("LOCATIONdata not loaded yet. Call loadJSONData() first.");
        }
        
        const loc = LOCATIONdata.locations.find(l => l.id === location_id);
        if (!loc) {
            throw new Error(`Location not found: ${location_id}`);
        }
        
        this.location_id = loc.id;
        this.location_n = loc.name;
        this.sub_locations = loc.sub_locations || [];   
        this.scene_id = loc.scenes && loc.scenes.length > 0 ? loc.scenes[0] : null;
        this.characters = loc.characters || []
    }

}

export class item {
    constructor(item_id) {
        if (!ITEMSdata || !ITEMSdata.items) {
            throw new Error("ITEMSdata not loaded yet. Call loadJSONData() first.");
        }
        
        const data = ITEMSdata.items.find(it => it.id === item_id);
        if (!data) {
            throw new Error(`Item not found: ${item_id}`);
        }
        this.id = data.id;
        this.state = state
        this.type = data.type;
        this.NV = data.NV ?? null;
        this.Eating_speed = data.Eating_speed ?? null;
        this.effect = data.effect ?? null;
        this.functionality = data.functionality ?? null;
        this.HarmRate = data.HarmRate ?? null;
        this.movable = data.movable || { access: false, weight: 0 };
        this.ignitable = data.ignitable ?? null;
    }
}

//VISUAL example of Character class usage

// const customChar = new Character(
//     null,          
//     "Bandit",       
//     "NPC",               
//     "aggressive",          
//     [
//         { health: 100 },
//         { action_speed: 5 },
//         { endurance: 40 },
//         { strength: 60 },
//         { init_items: ["knife", "water_bottle"] }
            // there is one more parameter for future use, but its not used now here (reactions)
//     ]
// );

//VISUAL example of Location class usage

//const house = new location("Init_house");

// house.characters.forEach(ch => {
//     console.log(ch.name, ch.health);
// });

// We can link certain characters to locations easily

// const me = new Character("Me");
// me.location = house;

// console.log(me.location.location_id); // "Init_house"


