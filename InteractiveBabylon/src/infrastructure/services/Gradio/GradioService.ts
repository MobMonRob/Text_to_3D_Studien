import { Client, handle_file, type SpaceStatus } from "@gradio/client";
import { PredictReturn } from "@gradio/client/dist/types";
import { BrowserCredentialRepository } from "../../browser-platform/BrowserCredentialRepository";

export type GradioOptions = {
  hf_token?: `hf_${string}`;
  status_callback?: (status: SpaceStatus) => void;
  events?: Array<"data" | "status">;
  headers?: Record<string, string>;
  // private?: boolean;
  // timeout?: number;
};

type Payload = unknown[] | Record<string, unknown>;
type Endpoint = `/${string}`;

export abstract class GradioService {
  private client?: Client = null;
  protected url: string;
  protected options?: GradioOptions;
  private static readonly maxConnectionRetries = 5;
  private connectionRetries = 0;

  constructor(url: string, options: GradioOptions = {}) {
    this.url = url;
    this.options = options;

    if (!this.options?.hf_token) {
      const hf_token = BrowserCredentialRepository
        .getCredentialSecret("hf_token_read_all");
      // .getCredentialSecret("hf_token");

      if (hf_token.startsWith("hf_")) {
        const token = hf_token.slice(3);
        // stupid ts does not recognize test for this.

        this.options.hf_token = `hf_${token}`;
      }
    }
  }

  async connect(): Promise<Client> {
    // Wenn bereits verbunden, sofort zurückkehren
    if (this.client) return this.client;

    // Prüfen, ob maximale Anzahl an Verbindungsversuchen erreicht ist
    if (this.connectionRetries > GradioService.maxConnectionRetries) {
      throw new Error(
        `Not able to connect to '${this.url}' after ${this.connectionRetries} retries.`,
      );
    }

    try {
      // Verbindung herstellen
      this.client = await Client.connect(this.url, this.options);
      console.log(`Successfully connected to Gradio app: ${this.url}.`);
      this.connectionRetries = 0; // Zurücksetzen bei erfolgreicher Verbindung
      return this.client;
    } catch (error) {
      console.error(`Failed to connect to Gradio app ${this.url}:`, error);
      this.connectionRetries++;
      let duration = Math.pow(2, this.connectionRetries) * 1000;
      await new Promise((resolve) => setTimeout(resolve, duration));
      return this.connect(); // Rekursion
    }
  }

  protected async predict(
    endpoint: Endpoint,
    payload?: Payload,
  ): Promise<PredictReturn> {
    if (!this.client) {
      await this.connect();
    }

    try {
      return await this.client.predict(endpoint, payload);
    } catch (error) {
      console.error(`Prediction failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async getApiInfo(): Promise<any> {
    if (!this.client) {
      await this.connect();
    }
    return await this.client.view_api();
  }

  handleFile(fileOrUrl: File | string | Blob | Buffer) {
    return handle_file(fileOrUrl);
  }

  async duplicateSpace(options?: GradioOptions): Promise<void> {
    try {
      const dupOptions = { ...this.options, /* as default */ ...options };
      if (!dupOptions.hf_token) {
        throw new Error("Hugging Face token is required for duplication");
      }
      this.client = await Client.duplicate(this.url, dupOptions);
      console.log(`Duplicated and connected to Gradio app: ${this.url}`);
    } catch (error) {
      console.error(`Failed to duplicate Gradio app ${this.url}:`, error);
      throw error;
    }
  }
}
