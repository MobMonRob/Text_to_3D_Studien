import { FileData } from "@gradio/client";
import { GradioOptions, GradioService } from "./GradioService";
import { Image } from "@babylonjs/gui";

export interface FluxSchnellParams {
  // prompt: string,
  seed?: number; // 0.0
  randomize_seed?: boolean; // true
  width?: number; // 1024
  height?: number; // 1024
  num_inference_steps?: number; // 4
}

export interface FluxSchnellResponse {
  image: Blob;
  usedSeed: number;
}

/**
 * Flux-Schnell is great for quickly generating images as assets,
 * but not ideal for multi-view consistency.
 * Better use MV-Adapter or something else for this use-case.
 * This just great image generation.
 *
 * @export
 * @class FluxSchnellService
 * @typedef {FluxSchnellService}
 * @extends {GradioService}
 */
export class FluxSchnellService extends GradioService {
  constructor(options: GradioOptions = {}) {
    super("black-forest-labs/FLUX.1-schnell", options);
  }

  private readonly DEFAULT_PARAMS: FluxSchnellParams = {
    seed: 0.0,
    randomize_seed: true,
    width: 1024,
    height: 1024,
    num_inference_steps: 4,
  };

  async generateImage(
    prompt: string,
    params: FluxSchnellParams = this.DEFAULT_PARAMS,
  ): Promise<FluxSchnellResponse> {
    let prediction = await this.predict("/infer", {
      prompt,
      ...params,
    });

    if (prediction.data[0].url == undefined) {
      throw new Error(
        "Image URL is undefined, most probably due to API change!",
      );
    }

    const imageResponse = await fetch(prediction.data[0].url);
    const image = await imageResponse.blob(); // obtains MIME-Type from response.

    console.log("🖼️ Flux Prediction: ", prediction);
    return { image, usedSeed: prediction.data[1] as number };
  }
}
