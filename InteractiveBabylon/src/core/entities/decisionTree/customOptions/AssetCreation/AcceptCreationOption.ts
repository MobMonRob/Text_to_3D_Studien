import {
  Color3,
  ImportMeshAsync,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import { BaseSuccessors, Option } from "../../BaseOptions/AbstractOption";
import { CreationEngagement, PlaneControl } from "../CreationOption";
import { Agent } from "../../Agent";
import { RollbackOption } from "../../BaseOptions/RollbackOption";
import { AbortOption } from "../../BaseOptions/AbortOption";
import { MeshRepository } from "../../../../../infrastructure/browser-platform/MeshRepository";

/**
 * Engagement for accepting a creation and proceeding to 3D model generation
 */
export interface AcceptCreationEngagement extends CreationEngagement {
  imageBlob: Blob;
  plane: PlaneControl;
  disposePlaceholder: () => void;
}

/**
 * Successors for the AcceptCreationOption
 */
export interface AcceptCreationSuccessors extends BaseSuccessors {
  // Add any specific successors for AcceptCreationOption here
}

/**
 * Option for accepting an image and proceeding to 3D model inference and placement
 */
export class AcceptCreationOption
  extends Option<AcceptCreationEngagement, AcceptCreationSuccessors> {
  override name = "3D-Model-Generation";
  override semanticDescription = [
    "3D Modell erstellen",
    "Bild akzeptieren",
    "Modell generieren",
    "In 3D umwandeln",
  ];

  public override nextOptions = {
    abort: new AbortOption(),
    rollback: new RollbackOption(),
  };

  protected override async executeEngagement(
    engage: AcceptCreationEngagement,
  ): Promise<void> {
    // 1. Notify user that we're proceeding with 3D model generation
    engage.user.newChatNotice(
      "Bild akzeptiert. Beginne mit der Generierung des 3D-Modells...",
    );

    // 2. Remove Background of image
    const noBackgroundImage = await engage.trellisService
      .removeImageBackground(engage.imageBlob);

    engage.plane.applyImageToPlane(noBackgroundImage);

    // 3. Infer 3D model using the image
    const model = await this.infer3DModel({
      ...engage,
      imageBlob: noBackgroundImage,
    });

    // 4. Place the 3D model in the scene
    await this.placeMeshInScene(engage, model);

    // 5. Notify user of successful completion
    engage.user.newChatNotice(
      "3D-Modell erfolgreich generiert und platziert! Was möchtest du als nächstes tun?",
    );
  }

  /**
   * Infers a 3D model from the provided image using Trellis service
   * @returns The created 3D mesh
   */
  private async infer3DModel(engage: AcceptCreationEngagement): Promise<Mesh> {
    // 1. Use Trellis to generate a 3D model from the image
    // TODO: trellisService is undefined here?!
    setTimeout(() => {
      engage.user.newChatNotice("Dein Modell wird gerade gebaut und ist gleich bereit..")
    }, 10_000);

    const modelBlob = await engage.trellisService.generate3DModel(
      [engage.imageBlob],
      { remove_background: false },
    );

    const modelUrl = URL.createObjectURL(modelBlob);
    const objectName = engage.objectName ?? "GeneratedMesh_" + Date.now();

    const newModel = await ImportMeshAsync(
      modelUrl,
      engage.worlds.activeWorld,
      {
        name: objectName,
        pluginExtension: ".glb",
      },
    );

    MeshRepository.downloadMesh(newModel.meshes[0]);
    // if (engage.history.userInput?.at(-1).message.includes("download")) {
    // with explicit command, for now we need it any time..
    // }

    // 3. Get the root mesh from the imported model
    const rootMesh = newModel.meshes[0] as Mesh;

    // 4. Identify salient points for proper positioning
    // TODO:
    // const salientPoints = await this.classifySalientPoints(engage);

    return rootMesh;
  }

  /**
   * Places the generated mesh in the scene in the appropriate position
   */
  private async placeMeshInScene(
    engage: AcceptCreationEngagement,
    mesh: Mesh,
  ): Promise<void> {
    engage.user.newChatNotice("Platziere dein 3D-Modell in der Szene...");

    // 1. Position at origin initially
    mesh.position = Vector3.Zero();

    // 2. Scale appropriately
    const semanticScale = await this
      .determineSemanticallyAppropriateScale(
        mesh,
        engage.agent,
      );
    mesh.scaling = new Vector3(semanticScale, semanticScale, semanticScale);

    // 3. Place in world space - can be refined based on user preference later
    engage.disposePlaceholder();

    // 4. Add appropriate materials if needed
    if (!mesh.material) {
      const defaultMaterial = new StandardMaterial(
        "defaultModelMaterial",
        engage.worlds.activeWorld,
      );
      defaultMaterial.diffuseColor = new Color3(0.7, 0.7, 0.7);
      mesh.material = defaultMaterial;
    }
  }

  /**
   * Classifies salient points of the object for better understanding of its structure
   */
  private async classifySalientPoints(engage: AcceptCreationEngagement) {
    try {
      const salientPoints = await engage.agent.inferSalientPointsOfWorld(
        engage.worlds.activeWorld,
      );

      return salientPoints;
    } catch (error) {
      console.warn("Could not determine salient points:", error);
      return [];
    }
  }

  /**
   * Determines an appropriate scale for the object based on its semantic meaning
   */
  private async determineSemanticallyAppropriateScale(
    mesh: Mesh,
    agent: Agent,
  ): Promise<number> {
    // Determine a reasonable scale based on the object type
    // For now, return a default scale
    return 7.0;

    // In a more advanced implementation, we would:
    // 1. Ask the agent to classify what type of object this is
    // 2. Apply a scale appropriate to that object type
    // 3. Consider the original image dimensions
  }
}
