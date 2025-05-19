import { Agent } from "../../Agent";
import { BaseSuccessors, Option } from "../../BaseOptions/AbstractOption";
import {
  CreationEngagement,
  CreationOption,
  PlaneControl,
} from "../CreationOption";
import { FluxSchnellService } from "/infrastructure/services/Gradio/FluxSchnellService";
import { AbortOption } from "../../BaseOptions/AbortOption";
import { RollbackOption } from "../../BaseOptions/RollbackOption";
import { AcceptCreationOption } from "./AcceptCreationOption";
import { Mesh } from "@babylonjs/core";

/**
 * Engagement for changing an existing creation
 */
export interface ChangeCreationEngagement extends CreationEngagement {
  objectDescription: string; // enriched by agent.
  lastSeed: number;
  planeControl: PlaneControl; // is this.history.userInput.at(...)
}

/**
 * Successors for the ChangeCreationOption
 */
export interface ChangeCreationSuccessors extends BaseSuccessors {
  accept: AcceptCreationOption;
  restart: CreationOption;
  change: ChangeCreationOption;
}

/**
 * Option for changing or refining an existing image generation
 */
export class ChangeCreationOption
  extends Option<ChangeCreationEngagement, ChangeCreationSuccessors> {
  override name = "Image-Modification";
  override semanticDescription = [
    "Bild anpassen",
    "Details verändern",
    "Optimieren",
    "Objekt anders machen",
    "Anpassungen vornehmen",
  ];

  // Initialize successors - will be properly set in constructor
  public override nextOptions = {
    abort: new AbortOption(),
    rollback: new RollbackOption(),
    change: this,
    accept: new AcceptCreationOption(),
    restart: null as CreationOption,
  };

  constructor(restartOption: CreationOption) {
    super();
    this.nextOptions.restart = restartOption;
  }

  private usersIterationSteps = 0;
  protected override async executeEngagement(
    payload: ChangeCreationEngagement,
  ): Promise<void> {
    const {
      worlds,
      agent,
      history,
      user,
      trellisService,
      fluxService,
      planeControl,
      lastSeed,
      objectDescription,
    } = payload;

    // const changePrompt = await payload.user.askForInput(
    //   "Welche Details möchtest du am Bild ändern?",
    // );
    const changePrompt = history.userInput.at(-1).message;
    // TODO: Check last message, if its actually a new description
    //       or wether user has to provide additional input..

    const updatedDescription = await this.nextOptions.restart
      .enrichAssetCreationPrompt(
        agent,
        changePrompt,
        objectDescription,
      );

    if (updatedDescription === "Inconclusive") {
      user.newChatNotice(
        "Leider habe ich deine Anpassungen nicht anwenden können, bitte versuche es nochmal.",
      );
      return this.engage(payload);
      // ? will automatically abort after x retries.
    }

    this.usersIterationSteps += 1;
    user.newChatNotice(
      "Verarbeite deinen Änderungswunsch, kurzen Moment bitte...",
    );

    // 3. Create the final prompt and generate image
    const finalObjectDescription = this.nextOptions.restart
      .createFinalPrompt(updatedDescription);

    const progressiveInferenceStep = this.usersIterationSteps < 4
      ? this.usersIterationSteps
      : 4; // allow for max of 10 inference steps.

    const imageResult = await fluxService.generateImage(
      finalObjectDescription,
      {
        seed: lastSeed,
        // width?: number; // 1024
        // height?: number; // 1024
        num_inference_steps: (6 + progressiveInferenceStep), // default 4, perfectionists should get better result tho :)
      },
    );

    // 4. Apply the processed image to the plane
    planeControl.applyImageToPlane(imageResult.image);

    // 6. Ask user for feedback on the modified image
    const userResponse = await payload.user.askForInput(
      updatedDescription.compactUserDescription +
        "Wie findest du das angepasste Bild? Möchtest du es weiter anpassen, neu starten oder daraus das 3D Modell erstellen?",
    );

    // 7. Determine user intention and proceed accordingly
    const choice = await this.chooseNextOption(payload, userResponse);

    if (choice.matches(this.nextOptions.accept)) {
      this.nextOptions.accept.engage({
        ...payload,
        imageBlob: imageResult.image,
        disposePlaceholder: () => planeControl.getPlane().dispose(false, true),
        plane: planeControl
      });
    } else if (choice.matches(this.nextOptions.restart)) {
      this.nextOptions.restart.engage(payload);
    } else if (choice.matches(this.nextOptions.change)) {
      this.nextOptions.change.engage({
        ...payload,
        objectDescription: finalObjectDescription,
      });
    } else {
      return await this.nextOptions.abort.engage(payload);
    }
  }
}
