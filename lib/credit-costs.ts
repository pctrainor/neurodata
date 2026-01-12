// Credit costs for different operations
export const CREDIT_COSTS = {
  // Brain nodes by model
  brain_node_flash: 1,      // Gemini 2.0 Flash
  brain_node_haiku: 1.5,    // Claude 3 Haiku
  brain_node_gpt4_mini: 2,  // GPT-4o-mini
  brain_node_sonnet: 5,     // Claude 3.5 Sonnet
  brain_node_gpt4: 5,       // GPT-4o
  brain_node_opus: 10,      // Claude 3 Opus
  
  // Other nodes
  preprocessing_node: 0.5,
  analysis_node: 0.5,
  reference_data_query: 0.5,
  output_node: 0.25,
  
  // Workflow templates
  content_impact_analyzer: 110,  // 100 brain nodes + processing
  media_bias_analyzer: 15,
  ad_effectiveness_tester: 12,
  neuro_psych_screener: 8,
}
