// Manage all AI providers & routing
const providers = {
  pollinations: require('./providers/pollinations'),
  gemini: require('./providers/gemini'),
  groq: require('./providers/groq'),
  openrouter: require('./providers/openrouter'),
  huggingface: require('./providers/huggingface')
};

const contextManager = require('./context');

class AIManager {
  constructor() {
    this.defaultProvider = 'gemini';
    this.defaultModel = 'gemini-3-flash';
  }

  async chat({ message, userId, channelId, model, provider }) {
    // Get conversation context
    const context = await contextManager.get(userId, channelId);
    
    // Use default if not specified
    provider = provider || this.defaultProvider;
    model = model || this.defaultModel;
    
    // Route to provider
    const providerService = providers[provider];
    const response = await providerService.chat({
      message,
      model,
      context
    });
    
    // Save to context
    await contextManager.add(userId, channelId, {
      role: 'user',
      content: message
    });
    await contextManager.add(userId, channelId, {
      role: 'assistant',
      content: response.text
    });
    
    return response.text;
  }
  
  async getAvailableModels(provider) {
    return providers[provider].getModels();
  }
}

module.exports = new AIManager();
