import {
  ContentListUnion,
  GenerateContentConfig,
  GenerateContentResponse,
  GoogleGenAI,
} from "@google/genai";
import { BrowserCredentialRepository } from "../browser-platform/BrowserCredentialRepository";

export class LanguageModelBackend {
  private client: GoogleGenAI;
  private model: string;

  constructor() {
    this.model = BrowserCredentialRepository.getCredentialSecret(
      "gemini_model",
    );

    // start client
    const gemini_token = BrowserCredentialRepository.getCredentialSecret(
      "gemini_token",
    );

    this.client = new GoogleGenAI({
      apiKey: gemini_token,
    });
  }

  async getChatCompletion(
    messages:
      ContentListUnion, /* Array<{ role: "user" | "model"; parts: [{text:string}] }> */
    config: GenerateContentConfig = {
      responseMimeType: "application/json",
    },
    model: string = this.model,
  ): Promise<GenerateContentResponse> {
    // TODO: Allow for images

    console.log(`❓ Requesting inference from: '${model}' with..`, messages);

    const completion = await this.client.models.generateContent(
      {
        model,
        contents: messages,
        config: config,
      },
    );

    console.debug("🤖 Inferred Answer from LLM:", completion.text);

    return completion;
  }
}
