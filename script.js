let rooms = [], roomNum;
const MAPWIDTH = 2;

let inputResolve = null; 

class GameWindow {
    constructor(text = null) {
        this.text = text;
    }
}

const globalObj = typeof window !== "undefined" ? window : globalThis;
export const Gwindow = globalObj.Gwindow || (globalObj.Gwindow = new GameWindow());

export function waitForInput() {
    return new Promise((resolve) => {
        inputResolve = resolve;
    });
}

function checkInput(e) {
    if (e.key == "Enter") {
        e.preventDefault();
        let cli = document.getElementById('cli');
        let content = (cli.innerText || cli.textContent).trim();
        cli.innerHTML = "";
        
        if (content === "") {
            globalObj.skipText = true;
        }
        
        Gwindow.text = content;
        
        if (inputResolve) {
            inputResolve(content);
            inputResolve = null;
        }
    }
}

function parser(cmd = "") {
    const trimmed = cmd.trim();
    if (!trimmed) return { verb: "", noun: "" };
    const cmdWords = trimmed.toUpperCase().split(/\s+/);
    const verb = cmdWords[0];
    const noun = cmdWords.slice(1).join(" ");
    return { verb, noun };
}

function showRoom() {
    if (!rooms[roomNum]) return;
    outputText(rooms[roomNum].name);
    outputText("You can go " + rooms[roomNum].exits);
}


function initDOM() {
    cli = document.getElementById("cli");
    outputPane = document.getElementById("output");

    cli.addEventListener("keydown", checkInput);
}


function initGame() {
    cli = document.getElementById("cli")
    output = document.getElementById("output")
    if (!cli || !output) {
        console.error("Required DOM elements are missing")
        return
    }
    rooms = []
}

export function outputText(txt) {
    if (!txt) return;
    
    let output = document.getElementById('output');
    if (!output) {
        console.error("Output element not found!");
        return;
    }
    
    let newPara = document.createElement("p");
    newPara.innerHTML = txt;
    output.appendChild(newPara);
    newPara.scrollIntoView();
}

const INTRO_TEXT = [
    "Welcome.",
    "Take a breath.",
    "This is a story-driven game.",
    "And to play it,",
    "you can just type what you want to do.",
    "Simple words are enough.",
    "If it sounds human — it usually works. No need to type 'Go north', or 'Go south'",
    "Be creative, and use a power of your language.",
    "There is no perfect way to play.",
    "You don’t need to guess the right command.",
    "Just say what feels natural.",
    "For example: Go to the kitchen / Pick up the passport / Leave the house",
    "You are not a hero here.",
    "You are just a person in a bad situation.",
    "Trying to make it through.",
    "The world outside is unstable.",
    "People are scared.",
    "Things happen fast.",
    "Some choices matter.",
    "Some mistakes are okay.",
    "The game will adapt to you.",
    "You can finish this game in about 10 minutes.",
    "But you can also slow down and explore.",
    "The game won’t always guide you.",
    "But it will try to understand you.",
    "You can skip the intro textes by pressing the space key, but it will not give you any privilege except the time, thich is what really MATTERS.",
    "Be yourself.",
    "Be human.",
    "Be the last of us.",
    "Let’s begin.",
    "",
    "",
    " "
];

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function HelloWorld() {
    console.log("HelloWorld function called, INTRO_TEXT length:", INTRO_TEXT.length);
    globalObj.skipText = false;
    for (const line of INTRO_TEXT) {
        if (line && line.trim() !== "") {
            outputText(line);
            if (!globalObj.skipText) {
                await sleep(1676);
            }
        }
    }
    globalObj.skipText = false;
    console.log("HelloWorld function completed");
}

globalObj.checkInput = checkInput;
globalObj.initGame = initGame;
