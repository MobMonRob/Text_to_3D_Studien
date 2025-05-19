import { GradioOptions, GradioService } from "./GradioService";

export interface GradioImage {
  path: string;
  meta: {
    _type: string;
  };
  orig_name: string;
  url: string;
}

export interface Trellis3DGenerateParams {
  // image: Blob | File | Buffer
  // multiimages any Default: []
  seed?: number; // 0
  ss_guidance_strength?: number; // 7.5
  ss_sampling_steps?: number; // 12
  slat_guidance_strength?: number; // 3
  slat_sampling_steps?: number; // 12
  multiimage_algo?: "stochastic" | "multidiffusion";
  remove_background?: boolean; // true
  // For .glb extraction
  mesh_simplify?: number;
  texture_size?: number;
}

export interface TrellisGlbExtractionParams {
  mesh_simplify: number; // 0.95
  texture_size: number; // 1024
}

export class TrellisService extends GradioService {
  constructor(options?: GradioOptions) {
    super("theseanlavery/TRELLIS-3D", options);
  }

  /**
   * @summary Does use rembg to remove image background.
   */
  async removeImageBackground(
    image: Blob,
  ): Promise<Blob> {
    await this.predict("/start_session");

    let preprocessedImage = await this.predict("/preprocess_image", {
      image,
    });
    // if not working, you might have to use: URL.createObjectURL

    console.log("Preprocessed Image..", preprocessedImage);
    const imageUrl = preprocessedImage.data[0].url;
    let ppImageResponse = await fetch(imageUrl);
    const imageWithoutBG = await ppImageResponse.blob();

    return imageWithoutBG;
  }

  private readonly DEFAULT_3D_MODEL_GENERATION_PARAMS: Trellis3DGenerateParams =
    {
      seed: 0,
      ss_guidance_strength: 7.5,
      ss_sampling_steps: 12,
      slat_guidance_strength: 3,
      slat_sampling_steps: 12,
      multiimage_algo: "stochastic",
      remove_background: true,
      // for .glb Extraction
      mesh_simplify: 0.95,
      texture_size: 1024,
    };

  /**
   * @summary Generates a 3D model from an image which is stripped of background first (unless turned off).
   * @returns Blob containing the 3D model in GLB format, which you can use with assetURL as ImportMeshAsync param.
   */
  async generate3DModel(
    images: Blob[],
    params: Trellis3DGenerateParams,
  ): Promise<Blob> {
    // TODO: Test Multi-images - Intake should provide consistent views.
    await this.predict("/start_session");

    if (images.length == 0) return new Blob();

    if (params.remove_background) {
      images = await Promise.all(
        images.map(async (image) => await this.removeImageBackground(image)),
      );
    }

    const defaultConfig = this.DEFAULT_3D_MODEL_GENERATION_PARAMS;

    let trellisResult = await this.predict("/image_to_3d", {
      image: images[0], // first image should be 'front face' image.
      // multiimages: images,
      seed: params.seed ?? defaultConfig.seed,
      ss_guidance_strength: params.ss_guidance_strength ??
        defaultConfig.ss_guidance_strength,
      ss_sampling_steps: params.ss_sampling_steps ??
        defaultConfig.ss_sampling_steps,
      slat_guidance_strength: params.slat_guidance_strength ??
        defaultConfig.slat_guidance_strength,
      slat_sampling_steps: params.slat_sampling_steps ??
        defaultConfig.slat_sampling_steps,
      multiimage_algo: params.multiimage_algo ?? defaultConfig.multiimage_algo,
    });

    console.log(trellisResult);

    // ? for faster export just use less details in texture
    return this.extractModelAsGlb({ mesh_simplify: 0.95, texture_size: 1024 });
  }

  /**
   * @returns Blob of type model/gltf-binary (I think :)
   */
  private async extractModelAsGlb(
    params: TrellisGlbExtractionParams,
  ): Promise<Blob> {
    const glbResult = await this.predict("/extract_glb", { ...params });

    const glbResponse = await fetch(glbResult.data[1].url);
    //                                            [0] is GLB/Gaussian, but we want polygons.
    if (!glbResponse.ok) {
      console.error(glbResponse);
      throw new Error(
        `Failed to fetch Trellis GLB model: ${glbResponse.statusText}`,
      );
    }

    return glbResponse.blob();
  }
}
