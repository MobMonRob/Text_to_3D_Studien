import { PBRMaterial, Scene, StandardMaterial, Texture, Vector2 } from "@babylonjs/core";
import { AbstractMesh, GroundMesh, Mesh, MeshBuilder } from "@babylonjs/core/Meshes";
import { WaterMaterial } from "@babylonjs/materials/water";
// import { UnifiedModel } from "./UnifiedModel";
import { ReflectingMesh } from "./ReflectingMesh";


export class Terrain {
    private groundTexture: Texture;
    private groundMaterial: PBRMaterial;
    private ground: ReflectingMesh<GroundMesh>;
    private waterMaterial: WaterMaterial;
    private water: ReflectingMesh<GroundMesh>;

    constructor(scene: Scene, name = "terrain") {
        // TODO: Ground Texture can be generated
        this.groundTexture = new Texture("public/textures/sand.jpg", scene);
        this.groundTexture.vScale = this.groundTexture.uScale = 10.0;

        // this.groundMaterial = new PBRMaterial("groundMaterial", scene);
        // this.groundMaterial.roughness = 0.2;
        // this.groundMaterial.albedoTexture = this.groundTexture;

        let ground = MeshBuilder.CreateGround(name, {
            width: 512, height: 512, subdivisions: 32, updatable: false
        }, scene);
        ground.position.y = -1;
        ground.material = this.groundMaterial;

        this.ground = new ReflectingMesh(ground);

        this.createWater(scene);
        // TODO: createTerrain (according to user input)
    }

    private createWater(scene: Scene, name = "water") {
        // Water
        let water = MeshBuilder.CreateGround(name + "Mesh", {
            width: 512, height: 512, subdivisions: 32, updatable: false
        }, scene);

        
        let waterMaterial = new WaterMaterial(
            name + "Material",
            scene, new Vector2(1024, 1024)
        );
        waterMaterial.backFaceCulling = true;
        waterMaterial.bumpTexture = new Texture("public/textures/waterbump.png", scene);
        waterMaterial.windForce = -5;
        waterMaterial.waveHeight = 0.5;
        waterMaterial.bumpHeight = 0.1;
        waterMaterial.waveLength = 0.1;
        waterMaterial.colorBlendFactor = 0;
        
        water.material = waterMaterial;

        this.water = new ReflectingMesh(water);
    }

    /* addToWaterReflection(meshes: AbstractMesh[]) {
        meshes.forEach(mesh => {
            this.waterMaterial.addToRenderList(mesh);
        })
    } */

    public GetGroundMesh() {
        return this.ground;
    }

    public GetWaterMesh() {
        return this.water;
    }
}