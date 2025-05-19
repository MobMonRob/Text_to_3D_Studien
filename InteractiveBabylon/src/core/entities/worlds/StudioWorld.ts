import { World } from "../environment/World";
import {
  Color3,
  Color4,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";

export class StudioWorld extends World {
  public override name = "StudioWorld";

  override createSky(): void {
    this.clearColor = new Color4(1, 1, 1, 1);
  }

  override createLight(): void {
    this.ambientColor = Color3.White();

    const lightTop = new HemisphericLight(
      "studioLightTop",
      new Vector3(0, 1, 0),
      this,
    );
    lightTop.intensity = 1.0;

    const lightBottom = new HemisphericLight(
      "studioLightBottom",
      new Vector3(0, -1, 0),
      this,
    );
    lightBottom.intensity = 1.0;
  }

  override createTerrain(): void {
    // const ground = MeshBuilder.CreateGround(
    //     "ground", { width: 1000, height: 1000 }, this
    // );
    // const groundMaterial = new StandardMaterial("groundMaterial", this);
    // groundMaterial.diffuseColor = Color3.White();
    // ground.material = groundMaterial;
    // ground.checkCollisions = true;
  }

  override loadDefaultScene() {
    // Create a purple sphere
    const sphere = MeshBuilder.CreateSphere("sphere", { diameter: 3 }, this);
    sphere.position = new Vector3(0, 20, 0);
    sphere.receiveShadows = false;

    const sphereMaterial = new StandardMaterial("sphereMaterial", this);
    sphereMaterial.specularColor = new Color3(0, 0, 0); // No specular color
    sphereMaterial.diffuseColor = new Color3(0.5, 0, 0.5); // Purple color
    sphere.material = sphereMaterial;

    var xSphere: Mesh = MeshBuilder.CreateSphere(
      "xSphere",
      { diameter: 7 },
      this,
    );
    xSphere.position.y = 10;
    xSphere.position.x = 10;

    var ySphere: Mesh = MeshBuilder.CreateSphere(
      "ySphere",
      { diameter: 5 },
      this,
    );
    ySphere.position.y = 20;

  }

  // TODO: When AddingMesh you have to `receiveShadows = false` it.
}
