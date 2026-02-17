// Each provider has same interface
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = {
  async chat({ message, model, context }) {
    const modelInstance = genAI.getGenerativeModel({ 
      model: model || 'gemini-3-flash' 
    });
    
    // Build chat with context
    const chat = modelInstance.startChat({
      history: context,
      generationConfig: {
        maxOutputTokens: 2000,
      }
    });
    
    const result = await chat.sendMessage(message);
    const response = result.response.text();
    
    return {
      text: response,
      tokens: response.length // simplified
    };
  },
  
  getModels() {
    return [
      'gemini-3-pro',
      'gemini-3-flash',
      'gemini-2.5-pro',
      // ... dari config
    ];
  }
};
