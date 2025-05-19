import {
  ArcRotateCamera,
  Color3,
  FlyCamera,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Texture,
  Vector3,
} from "@babylonjs/core";
import {
  BaseSuccessors,
  Option,
  OptionEngagement,
} from "../BaseOptions/AbstractOption";
import { World } from "../../environment/World";
import { AbortOption } from "../BaseOptions/AbortOption";
import { RollbackOption } from "../BaseOptions/RollbackOption";
import { Agent } from "../Agent";
import { AcceptCreationOption } from "./AssetCreation/AcceptCreationOption";
import { ChangeCreationOption } from "./AssetCreation/ChangeCreationOption";
import { TrellisService } from "../../../../infrastructure/services/Gradio/TrellisService";
import { FluxSchnellService } from "../../../../infrastructure/services/Gradio/FluxSchnellService";

/**
 * Base engagement for creation-related options with shared services
 */
export interface CreationEngagement extends OptionEngagement {
  trellisService?: TrellisService;
  fluxService?: FluxSchnellService;
  objectName?: string;
}

export interface CreationSuccessors extends BaseSuccessors {
  accept: AcceptCreationOption;
  change: ChangeCreationOption;
  restart: CreationOption;
}

/**
 * Interface for plane control functions to manipulate the display plane during image-optimization.
 */
export interface PlaneControl {
  applyImageToPlane: (image: Blob) => void;
  getPlane: () => Mesh;
}

/**
 * Option for creating a new asset from scratch
 */
export class CreationOption
  extends Option<CreationEngagement, CreationSuccessors> {
  public override nextOptions = {
    abort: new AbortOption(),
    rollback: new RollbackOption(),
    accept: new AcceptCreationOption(),
    change: new ChangeCreationOption(this), // ! cannot just reinit, as circular!
    restart: this, // same instance.
  };

  override name = "Asset-Generator";
  override semanticDescription = [
    "Neues Asset kreieren",
    "Mesh bauen",
    "Objekt erstellen",
    "Neu anlegen",
    "Neu anfangen",
  ];

  protected override async executeEngagement(
    payload: CreationEngagement,
  ): Promise<void> {
    // Destructure properties from payload for easier access
    const {
      worlds,
      agent,
      history,
      user,
      trellisService = new TrellisService(),
      fluxService = new FluxSchnellService(),
    } = payload;

    // 1. Switch to studio world for editing
    const worldSwitch = await worlds.switchToWorld("studio", false, false);

    user.newChatNotice(
      "Wir betreten nun das Studio. Gib mir in einen kurzen Moment, ich bau dir was..",
    );

    // 2. Initialize studio environment
    const planeControl = this.initializeStudioEnvironment(
      worlds.activeWorld,
    );
    worldSwitch.showWorld();

    // 3. Enrich user prompt for image generation
    const richDescription = await this.enrichAssetCreationPrompt(
      agent,
      history.userInput.at(-1).message,
    );

    if (richDescription === "Inconclusive") {
      return this.nextOptions.abort.engage(payload);
    }

    // 4. Generate and display initial image
    const finalObjDescription = this.createFinalPrompt(richDescription);
    const imageResult = await fluxService.generateImage(
      finalObjDescription,
    );

    planeControl.applyImageToPlane(imageResult.image);

    // 5. Ask for user feedback
    const brosRequest = richDescription.compactUserDescription +
      " Du kannst nun das Bild weiter anpassen, komplett neu generieren oder direkt aus dem Bild das 3D-Modell erstellen.";

    const newUserInput = await user.askForInput(brosRequest);
    const choice = await this.chooseNextOption(payload, newUserInput);

    /* const nextSteps = {
      "change": "Bild anpassen, Details verändern, optimieren, anders machen",
      "retry":
        "Neues Bild anfangen, gefällt nicht, schlechter Stil, anderer Stil, mehr Kreativität",
      "accept":
        "Bild entspricht Nutzer-Vorstellung, 3D kann generiert werden, weitermachen.",
      "abort": this.nextOptions.abort.semanticDescription.join(", "),
    }; */

    if (choice.matches(this.nextOptions.accept)) {
      await this.nextOptions.accept.engage({
        ...payload,
        trellisService,
        fluxService,
        imageBlob: imageResult.image,
        objectName: richDescription.objectName,
        // objectDescription: finalObjDescription,
        disposePlaceholder: () => planeControl.getPlane().dispose(),
        plane: planeControl,
      });
    } else if (choice.matches(this.nextOptions.change)) {
      return await this.nextOptions.change.engage({
        ...payload,
        trellisService,
        fluxService,
        objectName: richDescription.objectName,
        objectDescription: finalObjDescription,
        lastSeed: imageResult.usedSeed,
        planeControl,
      });
    } else if (choice.matches(this.nextOptions.restart)) {
      return await this.nextOptions.restart.engage(payload);
      // ! possible infin-loop, but user directed @ this point.
    } else {
      throw new Error(
        `User did not select a valid next option in ${this.name}!`,
      ); // ! Do not recurse on here, already done in .chooseNextOption
    }
    // ..Cleanup on success?
  }

  /**
   * Creates a formatted final prompt for image generation
   */
  public createFinalPrompt(
    richDescription: { positivePrompt: string; negativePrompt: string },
  ): string {
    return `
    ${richDescription.positivePrompt} ${richDescription.negativePrompt}
    Zeige das Bild als isometrische Projektion.`
      .replace(/\s{2,}/g, " ");
  }

  /**
   * Initializes the studio environment with a display plane
   */
  private initializeStudioEnvironment(
    world: World,
    width: number = 10,
    height: number = 10,
  ): PlaneControl {
    console.log("Initializing 🎙️ Studio World", world);

    // Clear current world objects
    const meshesToDispose = [...world.meshes];
    meshesToDispose.forEach((mesh) => {
      if (mesh.isEnabled) {
        mesh.dispose();
      }
    });

    // Create and configure the plane
    const plane = MeshBuilder.CreatePlane(
      "assetCreationPlane",
      { width, height },
      world,
    );
    plane.position = Vector3.Zero();
    plane.rotation = Vector3.Zero();

    // Set plane material
    const planeMaterial = new StandardMaterial("planeMaterial", world);
    planeMaterial.diffuseColor = new Color3(0.8, 0.7, 0.9); // Light purple
    planeMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
    plane.material = planeMaterial;

    // Position camera to view the plane
    const camera = world.activeCamera;
    if (camera instanceof FlyCamera || camera instanceof ArcRotateCamera) {
      camera.position = new Vector3(0, 3, -15);
      camera.lockedTarget = plane.position;
    } else {
      console.error(
        "📷 Camera cannot target image plane. Lets hope its still visible by default.",
      );
    }

    // Return functions to interact with the plane
    return {
      applyImageToPlane: (image: Blob) => {
        const imageUrl = URL.createObjectURL(image);
        plane.material.dispose();

        const material = new StandardMaterial("planeMaterial", world);
        material.diffuseTexture = new Texture(imageUrl, world);
        material.specularColor = new Color3(0, 0, 0); // Reduce shine
        material.backFaceCulling = false; // Show texture on both sides

        plane.material = material;
      },
      getPlane: () => plane,
    };
  }

  /**
   * Enriches the user's prompt with more detailed descriptions
   */
  public async enrichAssetCreationPrompt(
    agent: Agent,
    userPrompt: string,
    previousPrompt?: string,
  ) {
    const iterateOnPrompt = previousPrompt
      ? `\nBeachte, das dies ein Iterationsschritt ist und eine vorhergehende Beschreibung inhaltlich nach der Intention 
         der Nutzer-Prompt angepasst werden soll. Die vorhergehende Beschreibung: ${previousPrompt}\n`
      : "";

    const instructions = `
      Reichere die folgende Nutzer-Prompt mit mehr semantischen Details an.
      Identifiziere das primäre, abzubildende Objekt.
      Beschreibe die Absicht des Nutzers deskriptiv und präziser.
      Achte auf eine vollständige Beschreibung des gewünschten Objekts. 
      Erweitere deine Antwort um negative Prompts, die beabsichtigte Einschränkungen formulieren.
      Beschreibe das Objekt isoliert auf neutralem Hintergrund,
      wobei Du in den meisten Fällen weiß und bei sehr hellen, nahezu weißen Objekten
      beschreibst Du den Hintergrund bitte dunkelgrau.
      Achte dabei unbedingt darauf keine Reflektionen, eingebackene Schatten
      oder bei transparenten Gegenständen die Hintergrundfarbe zu beschreiben.
      Transparente Gegenstände sollen einen weißen Hintergrund haben.${iterateOnPrompt}
      Beschreibe die positivePrompt zudem in compactUserDescription.
      Ignoriere dabei den Hintergrund und die negativePrompt! 
      Beschreibe das gezeigte Objekt in einem Satz beginnend mit "Du siehst".
      Gebe dem Objekt noch einen Namen in CamelCase in objectName,
      mit mindestens drei verschiedenen Wörtern konkateniert.
    `.replace(/\s{2,}/g, " ");

    return await agent.inferJsonAnswer({
      instructions,
      templateToFill: {
        positivePrompt: "<string>",
        negativePrompt: "Das Bild zeigt keine <string>",
        compactUserDescription: "<string>",
        objectName: "<string>",
      },
      userPrompt,
      temperature: 1.2,
    });
  }
}
