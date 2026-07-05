import { Gwindow, outputText, waitForInput } from './script.js'

export function get_text(){
    return Gwindow.text
}

export async function get_user_input_async(){
    const text = await waitForInput(); 
    return text;
}

export function send_text(text){
    outputText(text)
}
