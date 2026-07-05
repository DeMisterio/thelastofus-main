
export const tokenized = (sentence) => {
    //Basically clean up the sentence by removing rubbish words
    //and return a list of objects with the word and its original index
    if(!sentence || typeof sentence !== "string") {
        return []
    }
    let cleaned = []
    let rubbish_set = [
        "a", "the", "on", "in", "for", "out", "of", "to", "and", "is", "it", 
        "at", "with", "as", "by", "from", "up", "about", "into", "over", 
        "after", "under", "again", "further", "then", "once", "here", 
        "there", "when", "where", "why", "how", "all", "any", "both", 
        "each", "few", "more", "most", "other", "some", "such", "no", 
        "nor", "not", "only", "own", "same", "so", "too", "very", "can", 
        "will", "just", "please", "could", "i", "my", "me", "want",
        "need", "think", "let", "do", "am", "was", "be", "been", "being",
        "have", "has", "had", "having", "would", "should", "shall", "may",
        "might", "must", "this", "that", "these", "those"
    ]
    const tokens = sentence.toLowerCase().split(/\s+/);
    for(let i = 0; i < tokens.length; i++){
        const word = tokens[i].replace(/[^a-z0-9_]/g, '');
        if(!word) continue;
        if(!rubbish_set.includes(word)){
            cleaned.push({
                "word": word,      
                "orig_index": i    
            })
        }
    }
    return cleaned
}
