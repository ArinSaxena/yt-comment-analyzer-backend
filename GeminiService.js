import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getSentiment = async (content) => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `Analyze the sentiment of the following comment. Respond with only one word: positive, negative, or neutral. Do not include any explanations, translations, or additional text.

  Comment: "Awesome video! I love it!"
  positive
  
  Comment: "This video is terrible. I hate it."
  negative
  
  Comment: "This video is good. I like it."
  neutral
  
  Comment: "${content}"
  `;
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const sentiment = response.text().toLowerCase().trim();
    console.log(response);
    return sentiment;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "error";
  }
};

export { getSentiment };
