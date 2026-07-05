import { levenshteinDistance } from './livenstein.js'
import { tokenized } from './tokenizer.js'
import { entity_data_base } from '../../entity_system/entity_init/objective_export.js'



export function match_items(sentence_obj, entity_db = entity_data_base) {
    let response = {
        'location': [],
        'sublocation': [],
        'item': [],
        'characters': []
    };
    //I make intelligent structured base of what has been found in the sentence
    function process_category(category_dict) {
        if (!category_dict || typeof category_dict !== 'object') return [];
        let all_candidates = [];
        let sentence_token_winners = {};
        
        const entity_ids = Object.keys(category_dict);

        for (let i = 0; i < entity_ids.length; i++) {
            let entity_id = entity_ids[i];
            let entity_tokens = category_dict[entity_id];
            if (!entity_tokens || !Array.isArray(entity_tokens) || entity_tokens.length === 0) continue;

            let match_data = {
                "id": entity_id,
                "is_complex": entity_tokens.length > 1,
                "token_matches": [],
                "probability": 0.0,
                "max_single_token_score": 0.0
            };
            //e_tok = entity token index
            //s_tok = sentence token index
            let total_token_prob = 0;
            let matched_indices_in_sentence = [];

            for (let e_tok = 0; e_tok < entity_tokens.length; e_tok++) {
                let best_word_score = -1;
                let best_word_index = -1;
                

                for (let s_tok = 0; s_tok < sentence_obj.length; s_tok++) {
                    let score = levenshteinDistance(entity_tokens[e_tok], sentence_obj[s_tok].word);
                    
                    if (score > best_word_score) {
                        best_word_score = score;
                        best_word_index = sentence_obj[s_tok].orig_index;
                    }
                }

                if (best_word_score > match_data.max_single_token_score) {
                    match_data.max_single_token_score = best_word_score;
                }

                match_data.token_matches.push({
                    'token': entity_tokens[e_tok],
                    'distance_score': best_word_score,
                    'index_in_sentence': best_word_index
                });

                total_token_prob += best_word_score;
                matched_indices_in_sentence.push(best_word_index);
            }

            let avg_token_prob = total_token_prob / entity_tokens.length;

            if (!match_data.is_complex) {
                match_data.probability = avg_token_prob;
            } else {
                let sorted_indices = matched_indices_in_sentence.sort((a, b) => a - b);
                let dist_sum = 0;
                let comparisons = 0;
                let avg_index_distance = 1;

                if (sorted_indices.length > 1) {
                    for (let k = 0; k < sorted_indices.length - 1; k++) {
                        dist_sum += (sorted_indices[k + 1] - sorted_indices[k]);
                        comparisons += 1;
                    }
                    avg_index_distance = dist_sum / comparisons;
                }

                let compactness = 1.0 / (avg_index_distance > 0 ? avg_index_distance : 1);
                match_data.probability = avg_token_prob * compactness;
            }

            all_candidates.push(match_data);

            for (let tm = 0; tm < match_data.token_matches.length; tm++) {
                let idx = match_data.token_matches[tm].index_in_sentence;
                let score = match_data.token_matches[tm].distance_score;
                
                if (!sentence_token_winners.hasOwnProperty(idx) || score > sentence_token_winners[idx].score) {
                    sentence_token_winners[idx] = {
                        'item_id': entity_id,
                        'score': score,
                        'token_used': match_data.token_matches[tm].token
                    };
                }
            }
        }

        all_candidates.sort((a, b) => b.probability - a.probability);
        let top_candidates = all_candidates.slice(0, 3);

        let final_winner = null;
        let complex_candidates = top_candidates.filter(c => c.is_complex);
        let potential_complex_winner = null;

        for (let cand = 0; cand < complex_candidates.length; cand++) {
            let has_support = false;
            let current_cand = complex_candidates[cand];

            for (let tm = 0; tm < current_cand.token_matches.length; tm++) {
                let idx = current_cand.token_matches[tm].index_in_sentence;
                
                if (sentence_token_winners.hasOwnProperty(idx)) {
                    if (sentence_token_winners[idx].item_id === current_cand.id) {
                        has_support = true;
                        break;
                    }
                }
            }
            if (has_support) {
                potential_complex_winner = current_cand;
                break;
            }
        }
        if (potential_complex_winner) {
            let best_overall = top_candidates[0];
            if (potential_complex_winner.probability >= best_overall.probability) {
                final_winner = potential_complex_winner;
            } else {
                final_winner = best_overall;
            }
        } else {
            final_winner = top_candidates[0] || null;
        }
        if (!final_winner) return [];

        let result = [];
        const STRICT_THRESHOLD = 0.85;
        const SOFT_THRESHOLD = 0.65;

        function check_worthiness(cand) {
            if (cand.probability > STRICT_THRESHOLD) {
                return { valid: true, reason: "High Probability" };
            }
            if (cand.probability > SOFT_THRESHOLD && cand.max_single_token_score >= 0.9) {
                return { valid: true, reason: "Soft Threshold + strong token support" };
            }
            return { valid: false, reason: "Low Probability" };
        }
        let outcome = check_worthiness(final_winner);
        if (outcome.valid) {
            result.push(final_winner);
            
            for (let cand = 0; cand < top_candidates.length; cand++) {
                if (top_candidates[cand].id !== final_winner.id) {
                    let cand_outcome = check_worthiness(top_candidates[cand]);
                    if (cand_outcome.valid) {
                        result.push(top_candidates[cand]);
                        break;
                    }
                }
            }
        }
        return result.map(r => r.id); 
    }

    response['location'] = process_category(entity_db['location']);
    response['sublocation'] = process_category(entity_db['sublocation']);
    response['item'] = process_category(entity_db['item']);
    response['characters'] = process_category(entity_db['characters']);
       
    return response;
}















