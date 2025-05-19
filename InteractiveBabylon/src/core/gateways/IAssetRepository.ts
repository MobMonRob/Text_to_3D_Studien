import { AssetsManager } from "@babylonjs/core";

export interface IAssetRepository {
    /**
     * Get a list of all assets in the repository.
     * @returns A promise that resolves to an array of asset names.
     */
    getAssets(): Promise<string[]>;
    /**
     * Get the details of a specific asset.
     * @param assetName The name of the asset.
     * @returns A promise that resolves to the asset details.
     */
    getAssetDetails(assetName: string): Promise<any>;
    /**
     * Add a new asset to the repository.
     * @param assetName The name of the asset.
     * @param assetDetails The details of the asset.
     * @returns A promise that resolves when the asset is added.
     */
    storeAsset(assetName: string, assetDetails: any): Promise<void>;
    /**
     * Update an existing asset in the repository.
     * @param assetName The name of the asset.
     * @param assetDetails The updated details of the asset.
     * @returns A promise that resolves when the asset is updated.
     */ 

}