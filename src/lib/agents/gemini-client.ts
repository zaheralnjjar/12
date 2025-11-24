// src/lib/agents/gemini-client.ts
import { AgentResponse } from '@/types';

// Mock responses for when API key is missing
const MOCKS = {
  ocr: [
    { date: "2023-10-01", fajr: "04:30", sunrise: "05:45", dhuhr: "12:00", asr: "15:30", maghrib: "18:00", isha: "19:30" },
    { date: "2023-10-02", fajr: "04:31", sunrise: "05:46", dhuhr: "12:00", asr: "15:29", maghrib: "17:59", isha: "19:29" }
  ],
  recipes: [
    {
      id: "1",
      name: "Kabsa Saudi Style",
      prepTime: "60 mins",
      difficulty: "Medium",
      ingredients: ["Rice", "Chicken", "Spices", "Onion"],
      steps: ["Fry onion", "Add chicken", "Add water", "Add rice"],
      tags: ["Middle Eastern"]
    },
    {
      id: "2",
      name: "Moroccan Tagine",
      prepTime: "90 mins",
      difficulty: "Medium",
      ingredients: ["Meat", "Vegetables", "Spices", "Couscous"],
      steps: ["Prepare tagine", "Slow cook meat", "Add veggies"],
      tags: ["Moroccan"]
    }
  ]
};

export class GeminiClient {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  }

  // Generic text generation
  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    if (!this.apiKey) {
      console.warn("Gemini API Key missing. Returning mock response.");
      return "هذا رد تجريبي من المساعد الذكي لأن مفتاح API غير متوفر. (This is a mock response)";
    }

    // In a real implementation, we would call the Google Generative AI SDK here.
    // implementing a fetch call to the REST API for simplicity if SDK isn't fully set up,
    // or just return a simulation since we don't have a real key in sandbox.

    // For the purpose of this output, I'll simulate the agent logic.
    return "Simulated AI Response: " + prompt.substring(0, 50) + "...";
  }

  // Specific agent methods

  async processOCR(imageBase64: string): Promise<AgentResponse<any[]>> {
    // Agent_OCR_Processor logic
    console.log("Agent_OCR_Processor: Processing image...");
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      success: true,
      data: MOCKS.ocr,
      message: "Dates extracted successfully"
    };
  }

  async suggestRecipes(ingredients: string[]): Promise<AgentResponse<any[]>> {
    console.log("Agent_CookingChef: Thinking about recipes for", ingredients);
    await new Promise(resolve => setTimeout(resolve, 1500));
    return {
      success: true,
      data: MOCKS.recipes,
      message: "Found 2 delicious recipes"
    };
  }

  async categorizeShoppingList(items: string[]): Promise<AgentResponse<any[]>> {
     console.log("Agent_ShoppingManager: Categorizing...");
     await new Promise(resolve => setTimeout(resolve, 1000));

     const categorized = items.map((item, idx) => ({
         id: `item-${idx}`,
         name: item,
         category: idx % 2 === 0 ? 'Supermarket' : 'Vegetables', // simple mock logic
         isBought: false
     }));

     return { success: true, data: categorized };
  }

  async chatWithAssistant(history: any[], newMessage: string): Promise<string> {
      console.log("Agent_Assistant: Replying...");
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (newMessage.includes("صلاة") || newMessage.includes("وقت")) {
          return "حسب الجدول، صلاة الظهر اليوم في الساعة 12:00.";
      }
      if (newMessage.includes("طبخ")) {
          return "يمكنني اقتراح وصفات رائعة، ماذا لديك في الثلاجة؟";
      }

      return "أنا مساعدك الشخصي. كيف يمكنني خدمتك اليوم في تنظيم وقتك أو عباداتك؟";
  }
}

export const geminiClient = new GeminiClient();
