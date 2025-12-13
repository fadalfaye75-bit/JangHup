import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateAssistantResponse = async (
  message: string,
  history: { role: 'user' | 'model'; content: string }[]
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    
    // Convert simplified history to format expected by Chat if needed, 
    // but for single turn or simple context passing, we can use sendMessage on a chat session.
    
    const chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction: `Tu es l'assistant intelligent de JàngHub, une plateforme scolaire au Sénégal. 
        Ton rôle est d'aider les élèves avec leurs devoirs, d'expliquer des concepts complexes, et d'aider les professeurs à rédiger des annonces.
        Sois poli, encourageant et utilise un ton pédagogique. Si on te demande de corriger un texte, explique les erreurs.`,
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.content }]
      }))
    });

    const result = await chat.sendMessage({ message });
    return result.text || "Désolé, je n'ai pas pu générer de réponse.";
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Une erreur est survenue lors de la communication avec l'assistant.";
  }
};
