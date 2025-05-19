
import { IAssetRepository } from "../../core/gateways/IAssetRepository";

class AssetRepository implements IAssetRepository {
    getAssets(): Promise<string[]> {
        throw new Error("Method not implemented.");
    }
    getAssetDetails(assetName: string): Promise<any> {
        throw new Error("Method not implemented.");
    }
    storeAsset(assetName: string, assetDetails: any): Promise<void> {
        throw new Error("Method not implemented.");
    }
}