import { Option, OptionName } from "./BaseOptions/AbstractOption";
import { LanguageModelBackend } from "../../../infrastructure/services/LanguageModelBackend";
import { History } from "./history/History";
import {
  Constants,
  RenderTargetTexture,
  RequestFileError,
} from "@babylonjs/core";
import { World } from "../environment/World";

export interface OptionIntent {
  chosenOption: Option;
  confidence: number;
  reasoning: string;
}

type SummarizationDegree =
  | "in maximal fünf Sätzen"
  | "in maximal drei Sätzen"
  | "als Stichpunkte in einer einfachen Liste"
  | "als Stichpunkte"
  | "als Schlüsselwörter";

export type Inconclusive = "Inconclusive";

type PlaneCoordinate = {
  x: number;
  y: number;
};

type SalientPoint = {
  point: PlaneCoordinate;
} & SalientPointSemantic;

export type SalientPointSemantic = {
  label: string[];
  semanticLocation: "oben" | "unten" | "links" | "mittig" | "rechts";
};

/**
 * Represents an agent capable of interacting with LLMs and managing history.
 */
export class Agent {
  private readonly history: History;
  private readonly backend: LanguageModelBackend;

  constructor(history: History, nonDefaultBackend?: LanguageModelBackend) {
    this.history = history;
    this.backend = nonDefaultBackend ?? new LanguageModelBackend();
  }

  async inferSalientPointsOfWorld(
    world: World,
    screen?: { width: number; height: number },
  ) {
    const screenshotMimeType = "image/webp";

    if (!screen) {
      screen = {
        width: 1920,
        height: 1080,
      }; // ? later Coordinate-Projection might be easier, if you crop it to mesh-size or smthn.
    }

    try {
      const rtt = new RenderTargetTexture(
        "sceneOnlyRTT",
        screen,
        world,
        {
          generateMipMaps: false,
          doNotChangeAspectRatio: false,
          samplingMode: Constants.TEXTURE_NEAREST_SAMPLINGMODE,
          // You might have to set a type, but is byte by default.
        },
      );

      // Important:
      rtt.activeCamera = world.activeCamera ?? world.cameras[0];
      rtt.renderList = world.meshes; // Nur die reinen 3D-Szenenobjekte

      // Für eine einmalige Aufnahme:
      rtt.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;

      world.render();

      // Short Pause for Render-Thread
      await new Promise((resolve) => setTimeout(resolve, 100));

      // renderList verwenden, nicht den Viewport clearen (normalerweise ok)
      rtt.render(
        true, // useCameraPostProcess?
        false, // dumpForDebug?
      );

      const pixelBuffer = await rtt.readPixels();
      // ! pixelBuffer just contains plain pixels - not encoded!
      if (!pixelBuffer) {
        throw new Error(
          "Cannot read Pixel-data from RenderTargetTexture! No Screenshot possible.",
        );
      }

      // RTT no longer required
      rtt.dispose();

      // 1. Transform PixelBuffer
      const uint8PixelData = new Uint8Array(
        pixelBuffer.buffer,
        pixelBuffer.byteOffset,
        pixelBuffer.byteLength,
      );

      // 2. Temporary Canvas
      const canvas = document.createElement("canvas");
      canvas.width = screen.width;
      canvas.height = screen.height;
      const ctx = canvas.getContext("2d");

      // 3. Create ImageData-Object
      const imageData = ctx.createImageData(screen.width, screen.height);

      // 4. Flip the Y-axis when setting the pixel data
      for (let y = 0; y < screen.height; y++) {
        const srcRow = (screen.height - y - 1) * screen.width * 4;
        // Source row (flipped)
        const destRow = y * screen.width * 4; // Destination row
        for (let x = 0; x < screen.width * 4; x++) {
          imageData.data[destRow + x] = uint8PixelData[srcRow + x];
        }
      }

      // 5. Paint ImageData on Canvas
      ctx.putImageData(imageData, 0, 0);
      // PNG-ENCODING by Browser in base64.
      const dataUrl = canvas.toDataURL(screenshotMimeType, 0.8);

      // Create a download link for the screenshot
      const downloadLink = document.createElement("a");
      downloadLink.href = dataUrl;
      downloadLink.download = `PreSalientPoint-screenshot-${Date.now()}.webp`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      // TODO: Check if this does work!

      // ! dataURL does only contain base64!!! (is not plain base64 yet)
      // Den reinen Base64-String extrahieren (ohne MIME-Typ Präfix)
      const base64Data = dataUrl.split(",")[1];
      console.log(base64Data);

      // PixelBuffer in das Gemini-Format konvertieren (Funktion aus vorheriger Antwort)
      return await this.inferSalientPointsInImage(
        base64Data,
        screenshotMimeType,
      );
    } catch (error) {
      console.error("Fehler beim Erfassen der reinen Szene:", error);
      throw error; // Fehler weiterleiten
    }
  }

  async inferSalientPointsInImage(
    base64Image: string,
    mimeType: "image/png" | "image/jpeg" | "image/webp",
    maxPoints: number = 69,
  ): Promise<SalientPoint[]> {
    // TODO: You have to instruct it with given semantic knowledge to better identify
    // ! Bcs. salient, distinct points are secondary features - we want to know the semantic in between!
    const locationOptions = ["oben", "unten", "links", "mittig", "rechts"];
    // ? front/back are defined by user-view on object!
    // * axis orthogonal views are defined by this location,
    // * where left/right in depth (on z-axis) implies front/back *relative to viewpoint*.

    const prompt = `
    Identifiziere weniger als ${maxPoints} der auffälligsten, markantesten Merkmale im gesamten Bild und vergib drei semantische Label,
    sowie den semantischen Ort der Merkmale entweder als: ${
      locationOptions.join(", ")
    }. 
    Antworte in Json Format: [{"point": <point>, "label": [<label1>, <label2>, <label3>], "semanticLocation":<semanticLocation>}, ...]. 
    Ein point ist definiert als: {y:<number>, x:<number>} Format und beschreibt Pixel ab dem Ursprung in der oberen, linken Ecke.`;
    const completion = await this.backend.getChatCompletion([
      {
        role: "user",
        parts: [
          {
            text: prompt,
          },
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
        ],
      },
    ]);

    try {
      const result = JSON.parse(completion.text) as SalientPoint[];

      const salientPointIsValid = (
        value: SalientPoint,
        _index: number,
        _array: SalientPoint[],
      ) =>
        value.point && value.point.x > 0 && value.point.y > 0 &&
        value.label && value.label.length > 1 &&
        locationOptions.includes(value.semanticLocation);

      if (result == null || !result.every(salientPointIsValid)) {
        console.error(result, completion);
        throw new Error(
          `Invalid Salient Points classification!`,
        );
      }

      return result;
    } catch (error) {
      const errorMessage = "Failed to parse summarization response!";
      console.error(errorMessage, error);
      return Promise.reject(errorMessage);
    }
  }

  /**
   * @returns {Promise<string>} exactly one string! No Json-object or any.
   */
  async inferSingleAnswer(prompt: string): Promise<string> {
    const completion = await this.backend.getChatCompletion(
      {
        role: "user",
        parts: [
          {
            text: `Answer in same language as the following text: ${prompt}`,
          },
        ],
      },
    );

    try {
      const result = JSON.parse(completion.text);
      const response = Object.values(result).join(" ");
      // ? Problem is, Gemini decides anything, so we just take all the responses as one.

      if (response == null) {
        console.error(result, completion);
        throw new Error(
          `'.response' not present on completion! Backend should *activate structured-output*.`,
        );
      }

      // some magic, which selects first value, as keys vary - unless explicitly specified.
      return response;
    } catch (error) {
      const errorMessage = "Failed to parse summarization response!";
      console.error("Failed to parse summarization response!", error);
      return Promise.reject(errorMessage);
    }
  }

  async inferJsonAnswer<T extends Record<string, any>>(
    request: {
      instructions?: string;
      templateToFill: T;
      userPrompt: string;
      temperature: 0.6 | 0.8 | 1 | 1.2 | 1.4; // we dont want chaos and also not nothing.
    },
  ): Promise<T | Inconclusive> {
    const jsonStructure = JSON.stringify(request.templateToFill);

    if (request.userPrompt == "") return "Inconclusive";

    request.instructions = request.instructions ??
      "Übertrage die Nutzer-Prompt in das Json-Format";

    const completion = await this.backend.getChatCompletion({
      role: "user",
      parts: [
        { text: request.instructions },
        {
          text:
            `Du antwortest nur mit dieser vollständig ausgefüllten JSON Vorlage:\n${jsonStructure}`,
        },
        { text: `Die Nutzer-Prompt:\n${request.userPrompt}` },
      ],
    }, {
      temperature: request.temperature,
      responseMimeType: "application/json",
    });

    try {
      const result = JSON.parse(completion.text) as T;

      // Validate that the result has the expected structure
      const templateKeys = Object.keys(request.templateToFill);
      const resultKeys = Object.keys(result);

      // müssen nur mindestens alle templateKeys enthalten sein,
      // alles zstl. ist uns erstmal egal.
      if (!templateKeys.every((key) => resultKeys.includes(key))) {
        console.error("Response is missing required fields from template");
        return "Inconclusive";
      }

      return result;
    } catch (error) {
      const errorMessage = "Failed to parse JSON response!";
      console.error(errorMessage, error);
      return Promise.reject(errorMessage);
    }
  }

  async summarize(
    text: string,
    degree: SummarizationDegree = "in maximal fünf Sätzen",
    additionalInstructions?: string,
  ): Promise<string> {
    if (text.trim() == "") {
      return Promise.reject("You did not provide any text to summarize!");
    }

    const instructions = `
    Fasse den folgenden Text ${degree} zusammen.
    Gib nur zurück: {"summary":"[summarization]"}
    Behalte die gleiche Sprache wie der Text bei.
    ${additionalInstructions}
    Fasse das zusammen:
    ${text}`.replace(/\s{2,}/g, " ");

    const completion = await this.backend.getChatCompletion({
      role: "user",
      parts: [
        {
          text: instructions,
        },
      ],
    });

    try {
      const result = JSON.parse(completion.text);
      const summary = result?.summary;

      if (summary == null) {
        throw new Error(
          `'.summary' not present on completion! (Text-to-summarize:"${completion.text}")`,
        );
      }

      return summary;
    } catch (error) {
      const errorMessage = "Failed to parse summarization response!";
      console.error("Failed to parse summarization response!", error);
      return Promise.reject(errorMessage);
    }
  }

  async classifyIntent(
    userPrompt: string,
    availableOptions: { [selector: OptionName]: string },
  ): Promise<string | Inconclusive> {
    const lowConfidenceId: Inconclusive = "Inconclusive";

    if (userPrompt.trim() == "") {
      return "Inconclusive";
    }

    const serialOptions = Object.entries(availableOptions)
      .map(([selector, description]) => `${selector}: ${description}`)
      .join("\n");

    const instructions = `
    Klassifiziere die Nutzerabsicht aus der Nutzereingabe.
    Wähle die wahrscheinlichste Option aus folgenden Optionen 
    (mit Mapping semantischer Schlüsselwörter):
    
    ${serialOptions}

    Gib NUR das Ergebnis im folgenden JSON-Format zurück:
    {"intendedFollowup":"[Optionsname]"}
    Wenn die Konfidenz niedrig ist, gib "${lowConfidenceId}" als intendedFollowup.
    Antworte dem Nutzer in dessen Sprache.
    Keine zusätzliche Ausgabe.
    Nutzereingabe: 
    ${userPrompt}
    `.replace(/\s{2,}/g, " ");

    const completion = await this.backend.getChatCompletion({
      role: "user",
      parts: [
        {
          text: instructions,
        },
      ],
    });

    try {
      const result = JSON.parse(completion.text);
      const followUp = result?.intendedFollowup;

      if (followUp == null) {
        throw new Error(
          `'.intendedFollowup' not present on completion! (Text:"${completion.text}")`,
        );
      }

      // Check if the followUp value exists in availableOptions
      const validOption = Object
        .keys(availableOptions)
        .includes(followUp);

      if (followUp !== lowConfidenceId && !validOption) {
        throw new Error(
          `Received invalid followUp value: "${followUp}" not found in available options`,
        );
      }

      return followUp;
    } catch (error) {
      const errorMessage = "Failed to parse intent classification response!";
      console.error(errorMessage, error);
      return "Inconclusive";
    }
  }
}
