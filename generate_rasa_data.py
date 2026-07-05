import os
import yaml

os.makedirs("rasa_project/data", exist_ok=True)

# nlu.yml
nlu_data = {
    "version": "3.1",
    "nlu": [
        {
            "intent": "attack",
            "examples": (
                "- attack the [zombie](target)\n"
                "- hit the [enemy](target) with [bat](tool)\n"
                "- attack him with my [knife](tool)\n"
                "- strike the [infected](target) using the [pipe](tool)\n"
                "- smash the [creature](target) with a [hammer](tool)\n"
                "- use the [machete](tool) to attack the [clicker](target)\n"
                "- swing the [baseball bat](tool) at [him](target)\n"
                "- I want to attack the [man](target)\n"
                "- bash the [runner](target) with [brick](tool)\n"
                "- hurt the [guard](target) using [shiv](tool)\n"
                "- attack the [bloater](target) with [axe](tool)"
            )
        },
        {
            "intent": "cut",
            "examples": (
                "- cut the [rope](target)\n"
                "- cut [it](target) with [scissors](tool)\n"
                "- slice the [bread](target) using [knife](tool)\n"
                "- use the [shiv](tool) to cut the [wire](target)\n"
                "- sever the [cable](target)\n"
                "- slash the [net](target) with my [blade](tool)\n"
                "- cut open the [box](target)\n"
                "- cut the [tape](target) using the [glass shard](tool)\n"
                "- tear the [fabric](target) with a [knife](tool)"
            )
        },
        {
            "intent": "ignite",
            "examples": (
                "- ignite the [wood](target) with [lighter](tool)\n"
                "- burn the [gasoline](target)\n"
                "- light the [fire](target)\n"
                "- ignite [this](target)\n"
                "- set the [trash](target) on fire using the [matches](tool)\n"
                "- use the [lighter](tool) to burn the [paper](target)\n"
                "- ignite the [molotov](target)\n"
                "- start a fire on the [corpse](target) with [flare](tool)\n"
                "- set fire to the [bushes](target)\n"
                "- light up the [torch](target)"
            )
        },
        {
            "intent": "inspect",
            "examples": (
                "- inspect the [room](target)\n"
                "- look at the [box](target)\n"
                "- examine the [corpse](target)\n"
                "- search the [drawer](target)\n"
                "- investigate the [body](target)\n"
                "- check out the [desk](target)\n"
                "- take a closer look at the [map](target)\n"
                "- look closely at [this](target)\n"
                "- inspect the [area](target)\n"
                "- what is in the [cabinet](target)"
            )
        },
        {
            "intent": "hook",
            "examples": (
                "- hook the [keys](target)\n"
                "- pull the [bag](target) with [hook](tool)\n"
                "- grab the [ladder](target) using the [pole](tool)\n"
                "- use the [rope](tool) to hook the [crate](target)\n"
                "- catch the [item](target) with my [hook](tool)\n"
                "- drag the [box](target) closer with the [stick](tool)"
            )
        },
        {
            "intent": "shoot",
            "examples": (
                "- shoot the [zombie](target)\n"
                "- shoot [him](target) with the [pistol](tool)\n"
                "- fire the [gun](tool) at [target](target)\n"
                "- pull the trigger on the [clicker](target)\n"
                "- use the [rifle](tool) to shoot the [enemy](target)\n"
                "- shoot the [lock](target) with my [revolver](tool)\n"
                "- fire at the [guard](target)\n"
                "- blast the [door](target) with the [shotgun](tool)\n"
                "- aim and shoot the [runner](target)"
            )
        },
        {
            "intent": "unlock",
            "examples": (
                "- unlock the [door](target)\n"
                "- open the [safe](target) with [keys](tool)\n"
                "- unlock the [glovebox](target)\n"
                "- use the [key](tool) to unlock the [gate](target)\n"
                "- pick the lock on the [door](target) with [shiv](tool)\n"
                "- unlock the [chest](target)\n"
                "- unlatch the [window](target)\n"
                "- open the [padlock](target) using [keys](tool)"
            )
        },
        {
            "intent": "drink",
            "examples": (
                "- drink the [water](target)\n"
                "- drink from the [bottle](target)\n"
                "- sip the [coffee](target)\n"
                "- consume the [soda](target)\n"
                "- gulp down the [juice](target)\n"
                "- drink the [liquid](target)\n"
                "- have some [water](target)"
            )
        },
        {
            "intent": "eat",
            "examples": (
                "- eat the [bread](target)\n"
                "- eat [stale bread](target)\n"
                "- consume the [food](target)\n"
                "- chew on the [jerky](target)\n"
                "- have a bite of the [apple](target)\n"
                "- eat the [canned beans](target)\n"
                "- swallow the [pills](target)\n"
                "- I want to eat the [ration](target)"
            )
        },
        {
            "intent": "store_items",
            "examples": (
                "- put the [keys](target) in the [box](destination)\n"
                "- store [food](target) in the [fridge](destination)\n"
                "- place the [gun](target) inside the [safe](destination)\n"
                "- stash the [ammo](target) in my [backpack](destination)\n"
                "- hide the [knife](target) in the [drawer](destination)\n"
                "- keep the [medkit](target) in the [cabinet](destination)"
            )
        },
        {
            "intent": "warm",
            "examples": (
                "- warm [Zack](target) with the [blanket](tool)\n"
                "- warm [myself](target)\n"
                "- get warm\n"
                "- heat up the [food](target) using the [fire](tool)\n"
                "- keep [her](target) warm with a [jacket](tool)\n"
                "- warm up near the [heater](tool)"
            )
        },
        {
            "intent": "wear",
            "examples": (
                "- wear the [mask](target)\n"
                "- put on the [gloves](target)\n"
                "- equip [shoes](target)\n"
                "- wear my [jacket](target)\n"
                "- put the [helmet](target) on\n"
                "- dress in the [armor](target)\n"
                "- put on my [gas mask](target)"
            )
        },
        {
            "intent": "sit",
            "examples": (
                "- sit down\n"
                "- sit on the [chair](target)\n"
                "- rest on the [sofa](target)\n"
                "- take a seat on the [bench](target)\n"
                "- sit upon the [floor](target)\n"
                "- I will sit on the [bed](target)"
            )
        },
        {
            "intent": "give",
            "examples": (
                "- give the [gun](target) to [Zack](recipient)\n"
                "- hand the [water](target) over to [him](recipient)\n"
                "- pass the [medkit](target) to [Ellie](recipient)\n"
                "- give [Joel](recipient) the [ammo](target)\n"
                "- transfer the [keys](target) to [Sarah](recipient)\n"
                "- offer the [food](target) to [the man](recipient)"
            )
        },
        {
            "intent": "go",
            "examples": (
                "- go to [kitchen](target)\n"
                "- walk to the [living room](target)\n"
                "- enter the [bedroom](target)\n"
                "- head towards the [garage](target)\n"
                "- move to the [hallway](target)\n"
                "- run to the [exit](target)\n"
                "- go outside to the [street](target)\n"
                "- proceed to the [basement](target)\n"
                "- step into the [bathroom](target)"
            )
        },
        {
            "intent": "pickup",
            "examples": (
                "- take the [keys](target)\n"
                "- pick up the [gun](target)\n"
                "- grab the [bottle](target) from the [table](source)\n"
                "- collect the [ammo](target)\n"
                "- pick up the [brick](target) from the [ground](source)\n"
                "- acquire the [map](target)\n"
                "- loot the [medkit](target)\n"
                "- snatch the [shiv](target)\n"
                "- retrieve the [backpack](target)"
            )
        },
        {
            "intent": "punch",
            "examples": (
                "- punch the [man](target)\n"
                "- hit [him](target)\n"
                "- strike the [enemy](target)\n"
                "- throw a punch at the [guard](target)\n"
                "- beat up the [zombie](target)\n"
                "- slug the [runner](target)\n"
                "- punch [it](target) in the face"
            )
        },
        {
            "intent": "signal",
            "examples": (
                "- signal for help\n"
                "- send a signal\n"
                "- wave my hands to signal\n"
                "- use the flare to signal\n"
                "- make a signal gesture"
            )
        },
        {
            "intent": "put",
            "examples": (
                "- put the [gun](target) on the [table](destination)\n"
                "- place the [bottle](target) there\n"
                "- set the [box](target) down on the [floor](destination)\n"
                "- put the [keys](target) onto the [desk](destination)\n"
                "- drop the [bag](target) near the [door](destination)\n"
                "- leave the [note](target) on the [fridge](destination)"
            )
        },
        {
            "intent": "throw",
            "examples": (
                "- throw the [lighter](tool) at the [fence](target)\n"
                "- toss the [dead woman](target)\n"
                "- throw [it](target)\n"
                "- hurl the [brick](tool) at the [window](target)\n"
                "- lob the [grenade](tool) towards the [enemies](target)\n"
                "- chuck the [bottle](tool) at the [clicker](target)\n"
                "- throw the [rock](tool) to distract them"
            )
        },
        {
            "intent": "open",
            "examples": (
                "- open the [drawer](target)\n"
                "- open the [fridge](target)\n"
                "- open the [door](target)\n"
                "- unseal the [box](target)\n"
                "- pull open the [cabinet](target)\n"
                "- open up the [trunk](target)\n"
                "- look inside the [bag](target)\n"
                "- pry open the [crate](target)"
            )
        }
    ]
}

with open("rasa_project/data/nlu.yml", "w") as f:
    yaml.dump(nlu_data, f, sort_keys=False)

# domain.yml
domain_data = {
    "version": "3.1",
    "intents": [
        "attack", "cut", "ignite", "inspect", "hook", "shoot", "unlock", "drink", "eat",
        "store_items", "warm", "wear", "sit", "give", "go", "pickup", "punch", "signal",
        "put", "throw", "open"
    ],
    "entities": [
        "target", "tool", "destination", "recipient", "source"
    ],
    "responses": {
        "utter_default": [{"text": "I can't understand any of that."}]
    }
}

with open("rasa_project/domain.yml", "w") as f:
    yaml.dump(domain_data, f, sort_keys=False)

# config.yml
config_data = {
    "recipe": "default.v1",
    "language": "en",
    "pipeline": [
        {"name": "WhitespaceTokenizer"},
        {"name": "RegexFeaturizer"},
        {"name": "LexicalSyntacticFeaturizer"},
        {"name": "CountVectorsFeaturizer"},
        {"name": "CountVectorsFeaturizer", "analyzer": "char_wb", "min_ngram": 1, "max_ngram": 4},
        {"name": "DIETClassifier", "epochs": 100, "constrain_similarities": True},
        {"name": "EntitySynonymMapper"}
    ],
    "policies": [
        {"name": "RulePolicy"}
    ]
}

with open("rasa_project/config.yml", "w") as f:
    yaml.dump(config_data, f, sort_keys=False)
