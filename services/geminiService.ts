import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

/**
 * Rédige une annonce complète basée sur des mots-clés ou un brouillon.
 */
export const generateAnnouncement = async (draft: string, role: string): Promise<string> => {
    try {
        const prompt = `
        Agis comme un expert en communication pour l'université JàngHub.
        
        Tâche : Rédige une annonce officielle, claire, professionnelle et engageante basée sur les informations suivantes (brouillon ou mots-clés) : 
        "${draft}"
        
        L'auteur de l'annonce est un : ${role === 'ADMIN' ? 'Membre de l\'administration' : 'Délégué de classe'}.
        
        Consignes :
        1. Utilise un ton formel mais accessible.
        2. Structure le message avec des paragraphes clairs.
        3. Corrige toutes les fautes d'orthographe et de grammaire.
        4. Ajoute une formule de politesse adaptée.
        5. Ne mets pas de titre explicite genre "Objet:", commence directement le corps du message.
        6. Ne signe pas le message (la signature est automatique).
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        return response.text?.trim() || draft;
    } catch (error) {
        console.error("Error calling Gemini API for Announcement:", error);
        throw new Error("Impossible de rédiger l'annonce pour le moment.");
    }
};

/**
 * Reformule une question de sondage pour qu'elle soit plus pertinente.
 */
export const reformulatePollQuestion = async (draftQuestion: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Tu es un expert en enquêtes et sondages. Reformule la question suivante pour qu'elle soit plus claire, neutre, concise et engageante pour des étudiants universitaires : "${draftQuestion}".
            Réponds UNIQUEMENT par la question reformulée, sans guillemets ni texte additionnel.`,
        });
        
        return response.text?.trim() || draftQuestion;
    } catch (error) {
        console.error("Error calling Gemini API for Poll:", error);
        return draftQuestion;
    }
};