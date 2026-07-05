// thelastofus/log_system/log_it.js

import { GameControl } from '../event_control/entity_system/entity_init/objective_export.js';

// I will use this log system to track player actions and game state changes (and send them to my server later hehe)
export class Logs {
    constructor() {
        this.logs = [];
    }
    add_log(action_data) {
        //adding log entry
        
        const actor = GameControl.player ?? GameControl.getChar("Me");
        const currentLoc = GameControl.current_location;
        const currentSub = GameControl.active_sub_location || "main_area";

        const now = new Date();
        const timeString = now.toLocaleTimeString('en-GB', { hour12: false }); // 14:35:12

        const logEntry = {
            "scene": [GameControl.scene ? GameControl.scene.scene_title : "Unknown"],
            "location": [currentLoc.location_id, currentSub],
            "Command_RAW": action_data.command_raw,
            "Command_formated": action_data.command_formatted, // { action: "go", entity: [...] }
            "RTA": timeString,
            "CID": [
                { "health": actor.health },
                { "action_speed": actor.action_speed },
                { "endurance": actor.endurance },
                { "strength": actor.strength },
                { "init_items": [...actor.init_items] } 
            ],
            "Status": action_data.status // {"success": "...", "reason": "..."}
        };

        this.logs.push(logEntry);
    }

    get_last_log() {
        if (this.logs.length === 0) return null;
        return this.logs[this.logs.length - 1];
    }
}

export const Logger = new Logs();