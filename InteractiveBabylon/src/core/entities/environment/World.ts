import {
  AbstractMesh,
  Engine,
  HemisphericLight,
  ImportMeshAsync,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  ReflectionProbe,
  Scene,
  Vector3,
} from "@babylonjs/core";
import { Sky } from "./Sky";
import { WorldInsight } from "./WorldInsight";
import { Terrain } from "./Terrain";
// import { UnifiedModel } from "./UnifiedModel";
import { ReflectingMesh } from "./ReflectingMesh";

export class World extends Scene {
  private sky: Sky;
  private terrain: Terrain;
  public readonly name: string;

  constructor(engine: Engine, canvas: HTMLCanvasElement, name?: string) {
    super(engine);

    this.name = name ?? `World_${Date.now}`;

    this.createTerrain();
    this.createSky();
    this.createLight();
    // this.createUserInterface();

    this.loadDefaultScene();

    this.createCamera(canvas); // canvas for camera controls.
  }

  protected createCamera(canvas: HTMLCanvasElement) {
    const primaryView = WorldInsight.createView(this);
    primaryView.attachControl(canvas, true);
    this.addCamera(primaryView);
  }

  protected createLight() {
    // Create and configure the light
    // Reflection probe for sky
    // TODO: Geht auch ohne, aber dann muss balanciert werden..
    // ? Sprich alle Meshes müssen in Rendering Liste von SkyBox stehen,
    // ? fehlt nur eins, ists schwarz.
    var light = new HemisphericLight(
      "hemisphericLight_1",
      new Vector3(0, 5, 0),
      this,
    );
    light.intensity = 2;
    light.range = 100;
    light.setEnabled(true);

    // new PointLight("pointLight_1", new Vector3(0, 5, 0), this);
  }

  protected createSky() {
    console.log("Creating sky..");
    this.sky = new Sky(this);
  }

  protected createTerrain() {
    // TODO: Fix this.
    this.terrain = new Terrain(this);
    // this.terrain.GetGroundMesh().shouldReflect(this.sky)
  }

  protected createUserInterface() {
    // Toolbar does live longer than world might,
    // its initalized in WorldManager
  }

  public placeModel(
    model: ReflectingMesh<AbstractMesh>,
    position = Vector3.Zero(),
    rotation?: Vector3,
    includeChildMeshes = true,
  ): World {
    model.mesh.position = position;

    if (rotation) {
      model.mesh.rotation = rotation;
    } // otherwise keep models applied rotation.

    model.shouldReflect(
      [this.sky.getSkyBox()],
    );

    this.addMesh(model.mesh, includeChildMeshes);

    return this; // to allow for builder Pattern while placing Models.
  }

  protected loadDefaultScene() {
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

    var zSphere: Mesh = MeshBuilder.CreateSphere(
      "zSphere",
      { diameter: 3 },
      this,
    );
    zSphere.position.y = 10;
    zSphere.position.z = 10;

    // skyReflection Physically Based Rendering Material for speheres
    const sharedPbrMaterial = new PBRMaterial("sharedPbr", this);
    const sharedReflectionProbe = new ReflectionProbe(
      "sharedPbrProbe",
      512,
      this,
    );
    sharedPbrMaterial.reflectionTexture = sharedReflectionProbe.cubeTexture;

    const xModel = new ReflectingMesh(xSphere);
    const yModel = new ReflectingMesh(ySphere);
    const zModel = new ReflectingMesh(zSphere);

    xModel.shouldReflect(
      [this.sky.getSkyBox(), yModel.mesh, zModel.mesh],
    );

    yModel.shouldReflect(
      [this.sky.getSkyBox(), xModel.mesh, zModel.mesh],
    );

    zModel.shouldReflect(
      [this.sky.getSkyBox(), xModel.mesh, yModel.mesh],
    );

    // Import SceneLoader at the top of the file

    // Load the futuristic table model
    ImportMeshAsync("/futuristic-table.glb", this).then((result) => {
      // Create a reflecting mesh with the root mesh
      const tableModel = new ReflectingMesh(result.meshes[0]);
      this.placeModel(tableModel);
    });
  }
}
