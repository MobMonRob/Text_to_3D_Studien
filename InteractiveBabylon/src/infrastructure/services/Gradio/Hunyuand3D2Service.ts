import { GradioService, GradioOptions } from './GradioService';

export interface Hunyuan3DParams {
    image: Blob;
    negative_prompt?: string;
    num_steps?: number;
    background_already_removed?: boolean
    // Weitere Parameter nach Bedarf
}

export class Hunyuan3D2Service extends GradioService {
    // TODO: TEST
    constructor(options: GradioOptions = {}) {
        super("Tencent/Hunyuan3D-2", options);
    }

    async generate3DModel(params: Hunyuan3DParams) {
        // TODO: You HAVE TO remove background yourself!!!

        if (!params.background_already_removed) {
            throw new Error("Not implemented yet, to remove background for Hunyuan3D-2.");
        }

        // this.client.

        return await this.predict("/predict", { ...params });
    }
}