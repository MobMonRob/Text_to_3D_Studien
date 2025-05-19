// import * as GUI from '@babylonjs/gui';
import {
  AdvancedDynamicTexture,
  Container,
  InputText,
  Rectangle,
  ScrollViewer,
  StackPanel,
  TextBlock,
} from "@babylonjs/gui";

import ToolbarGui from "./view-templates/ToolbarGui.json";
// ! This View is tightly coupled to ToolbarGui!

import { DecisionTree } from "../../core/entities/decisionTree/DecisionTree";
import { WorldManager } from "/core/entities/worlds/WorldManager";
import { World } from "/core/entities/environment/World";
import { History } from "/core/entities/decisionTree/history/History";
import { MeshRepository } from "../../infrastructure/browser-platform/MeshRepository";

export interface ToolbarViewOptions {
  templatePath?: string;
  onSettingsButtonClicked?: (buttonName: string) => void;
}

// TODO: Ist aktuell mit User vermischt, weil ich dachte weniger schlau und schnell zu sein...
export class ToolbarView {
  private advancedTexture: AdvancedDynamicTexture; // the actual GUI
  private worlds: WorldManager;
  private options: ToolbarViewOptions;
  private rootContainer: Container | null = null;

  private chatScrollViewer: ScrollViewer | null = null;
  private chatStackPanel: StackPanel | null = null;
  private chatHistory: { role: "Bro" | "You"; message: string }[] = [];
  private history: History;

  private brosRectTemplate: Rectangle; // with children[0] = TextBlock
  private yourRectTemplate: Rectangle; // with children[0] = TextBlock
  private activeCallback: (prompt: string) => void;

  constructor(
    worlds: WorldManager,
    options: ToolbarViewOptions = {},
  ) {
    this.worlds = worlds;
    this.history = worlds.history;
    this.options = {
      templatePath: options.templatePath ||
        "/public/viewTemplates/Toolbar.json",
      onSettingsButtonClicked: options.onSettingsButtonClicked ||
        ((buttonName: string) =>
          console.log(`Settings-Button clicked: ${buttonName}`)),
    };

    this.attachToNewWorld(this.worlds.activeWorld);
  }

  /**
   * Attaches this toolbar to the new active world when a world change occurs.
   * Should be called when the WorldManager switches to a different world.
   */
  public async attachToNewWorld(
    worldToAttachTo: World,
    enableUserInput: boolean = true,
  ): Promise<void> {
    if (!worldToAttachTo) return;

    // Dispose und Neuaufbau der GUI
    if (this.advancedTexture) {
      this.advancedTexture.dispose();
    }

    this.advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI(
      "ToolbarUI",
      true,
      worldToAttachTo,
    );

    // First create the texture
    this.advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI(
      "ToolbarUI",
      true,
      worldToAttachTo,
    );

    // Load the template first
    await this.loadGuiTemplateAndInitChat();

    // Now we can get controls
    const promptInputControl = this.advancedTexture.getControlByName(
      "PromptInput",
    ) as InputText;

    promptInputControl.isEnabled = enableUserInput;

    // Register events
    this.registerObservables();

    if (!this.chatHistory) return; // init-state

    const chatHistoryCopy = [...this.chatHistory];
    this.clearChat();

    // Wiederherstellen aus der Datenstruktur statt aus GUI-Objekten
    chatHistoryCopy.forEach((entry) => {
      if (entry.role === "Bro") {
        this.addBrosMessage(entry.message, false);
      } else {
        this.addYourMessage(entry.message, false);
      }
    });
  }

  private async loadGuiTemplateAndInitChat(): Promise<void> {
    this.advancedTexture.parseSerializedObject(ToolbarGui);
    this.rootContainer = this.advancedTexture.getChildren()[0] as Container;

    // Referenzen auf ScrollViewer und StackPanel holen
    const chatScrollViewer = this.advancedTexture.getControlByName(
      "ScrollViewer",
    ) as ScrollViewer;
    if (!chatScrollViewer) {
      console.error("Cannot find Chat ScrollViewer!");
      return;
    }

    this.chatStackPanel = chatScrollViewer.children.find(
      (control) => control.name === "StackPanel",
    ) as StackPanel;

    if (!this.chatStackPanel) {
      console.error(
        "Cannot find StackPanel to append your messages! Aborting initialization..",
      );
      return;
    }

    this.initializeChatHistory();
  }

  private initializeChatHistory(): void {
    if (!this.chatStackPanel) {
      console.error("StackPanel for Chat not available!");
      return;
    }

    // console.log("Children that Toolbar is initialized with...");
    // console.log(this.chatStackPanel.children);

    this.yourRectTemplate = this.chatStackPanel.children[0]
      .clone() as Rectangle;
    (this.yourRectTemplate.children[0] as TextBlock).text = "";

    this.brosRectTemplate = this.chatStackPanel.children[1]
      .clone() as Rectangle;
    (this.brosRectTemplate.children[0] as TextBlock).text = "";

    const childrenToRemove = [...this.chatStackPanel.children];
    childrenToRemove.forEach((child) => {
      this.chatStackPanel?.removeControl(child);
      // Nicht dispose() aufrufen, da wir die Templates noch brauchen!
    });

    if (this.chatHistory.length === 0) {
      this.addBrosMessage(
        "Hi! Ich bin dein Kreativ-Assistent. Was möchtest Du heute bauen?",
      );
    }
  }

  private createChatRectangle(
    forRole: "Bro" | "You",
    fullText: string,
  ): Rectangle {
    const timestamp = Date.now();

    const rect = forRole == "Bro"
      ? this.brosRectTemplate.clone() as Rectangle
      : this.yourRectTemplate.clone() as Rectangle;

    rect.name = `${forRole}_Rectangle_${timestamp}`;

    const textblock = rect.children[0] as TextBlock;

    textblock.name = rect.name = `${forRole}_TextBlock_${timestamp}`;
    textblock.text = `${forRole}: ${fullText}`;
    textblock.fontSize = 17;

    return rect;
  }

  /**
   * Fügt eine Nachricht vom Benutzer ("You") zur Chat-Historie hinzu.
   * @param message Der Text der Nachricht.
   */
  public addYourMessage(
    message: string,
    AddToGlobalHistory: boolean = true,
  ): void {
    if (!this.chatStackPanel) return;

    this.chatHistory.push({ role: "You", message });

    // TODO: Somehow the same input ends up twice in history!
    if (AddToGlobalHistory) {
      this.history.appendToHistory({
        role: "user",
        type: "input",
        message,
      });
    }

    const userRect = this.createChatRectangle("You", message);

    this.chatStackPanel.addControl(userRect);
  }

  /**
   * Fügt eine Nachricht vom LLM ("Bro") zur Chat-Historie hinzu.
   * @param message Der Text der Nachricht.
   * @param isInitialOrStatusMessage Optional. Wenn true, wird für diese Nachricht möglicherweise nicht gescrollt (nützlich für Status-Updates).
   */
  public addBrosMessage(
    message: string,
    AddToGlobalHistory: boolean = true,
  ): void {
    if (!this.chatStackPanel) {
      throw new Error("No Chat-StackPanel to append your Message to!");
    }

    const appendToBrosLastMessage = this.chatHistory?.at(-1)?.role == "Bro";

    // Check if last message was from Bro and should be extended
    if (appendToBrosLastMessage) {
      // Extend last message text content
      this.chatHistory.at(-1).message += `\n    ${message}`;

      // Get the UI element and update it
      const lastRectangle = this.chatStackPanel
        .children.at(-1) as Rectangle;
      const textBlock = lastRectangle.children[0] as TextBlock;
      textBlock.text += `\n${message}`;
      return;
    }

    const brosRect = this.createChatRectangle("Bro", message);
    this.chatStackPanel.addControl(brosRect);

    this.chatHistory.push({ role: "Bro", message });

    if (AddToGlobalHistory) {
      this.history.appendToHistory({
        role: "agent",
        type: "output",
        message,
      });
    }
  }

  public askForInput(brosMessage: string): Promise<string> {
    console.log("🧠 Asking User for Input...");

    // Reset any previously active callback
    if (this.activeCallback) {
      console.warn(
        "Overriding existing input callback. Previous request will not be fulfilled!",
      );
    }

    // Show the message to the user
    this.addBrosMessage(brosMessage);
    this.resetUserPromptInput();

    // Return a Promise that will resolve when the user provides input
    return new Promise<string>((resolve) => {
      this.activeCallback = resolve;
    });
  }

  public resetUserPromptInput() {
    const promptInput = this.advancedTexture.getControlByName(
      "PromptInput",
    ) as InputText;

    promptInput.text = "";
    promptInput.isEnabled = true;
  }

  /**
   * Verarbeitet die Eingabe aus dem PromptInput-Feld.
   * Wird aufgerufen, wenn Enter gedrückt wird oder der Submit-Button geklickt wird.
   * @param promptText Der Text aus dem Eingabefeld.
   */
  private async handlePromptSubmission(promptText: string): Promise<void> {
    // handle Input
    const promptInput = this.advancedTexture.getControlByName(
      "PromptInput",
    ) as InputText;

    if (!promptText || !promptInput) return;

    if (promptText == "clear chat") {
      this.clearChat();
      this.resetUserPromptInput();
      return;
    }

    if (promptText.startsWith("view ")) {
      const worldName = promptText.substring(5).trim();
      this.addYourMessage(promptText);
      this.addBrosMessage(`Wechsle zur Welt: ${worldName}...`);

      try {
        await this.worlds.switchToWorld(worldName);
        this.addBrosMessage(`Du bist jetzt in der Welt "${worldName}".`);
      } catch (error) {
        console.error(`Failed to switch to world "${worldName}":`, error);
        this.addBrosMessage(
          `Konnte nicht zur Welt "${worldName}" wechseln. Habe sie nicht gefunden. Bitte überprüfe den Namen.`,
        );
      }

      this.resetUserPromptInput();
      return; // from commanding.
    }

    // if (promptText == "show salient points") // => activate all salient Points in img
    // else if (promptText == "hide salient points")

    promptInput.isEnabled = false;

    // short-circuit requested input to target.
    if (this.activeCallback) {
      this.addYourMessage(promptText);
      const injector = this.activeCallback;
      this.activeCallback = null; // release
      injector(promptText); // might not return!
      return;
    }

    const startMsg = "Starting new Decision Tree Flow";
    console.log(`--- ${startMsg} ---`);
    this.history.appendToHistory({
      role: "developer",
      type: "separator",
      message: startMsg,
    });

    this.addYourMessage(promptText);
    // Transparent Status-message from "Bro"
    this.addBrosMessage("Verarbeite deine Anfrage...");

    // Default to starting new...
    console.log("Initializing new DecisionTree");
    const activeDecisionTree = new DecisionTree(
      this.worlds,
      this.history, // ? contains user input.
    );
    await activeDecisionTree.start(
      {
        askForInput: this.askForInput.bind(this), // bind, to keep .this intact!
        newChatNotice: this.addBrosMessage.bind(this),
      },
    );

    console.log("Done with this DecisionTree.");

    setTimeout(() => {
      this.resetUserPromptInput();
    }, 800);

    return;
  }

  public clearChat() {
    console.log(
      `Clearing chat-history..`,
    );

    const childrenToRemove = [...this.chatStackPanel.children];
    childrenToRemove.forEach((child) => {
      this.chatStackPanel?.removeControl(child);
      child.dispose(); // release them, as no longer req.
    });

    this.chatHistory = [];
  }

  private registerObservables() {
    this.advancedTexture.getControlByName("SettingsButton")
      ?.onPointerClickObservable.add(
        () => {
          MeshRepository.uploadMeshFile(this.worlds.activeWorld);
        },
      );

    const promptInputControl = this.advancedTexture.getControlByName(
      "PromptInput",
    ) as InputText;
    if (promptInputControl) {
      promptInputControl.onKeyboardEventProcessedObservable.add(
        (eventData, eventState) => {
          if (
            eventData.key === "Enter" &&
            eventData.type === "keydown"
          ) {
            const currentInput = eventState.target as InputText;
            const prompt = currentInput.text.trim();
            if (prompt == "") {
              return;
            }

            this.handlePromptSubmission(currentInput.text.trim());
          }
        },
      );
    }
  }

  public getAdvancedTexture(): AdvancedDynamicTexture {
    return this.advancedTexture;
  }

  public getRootContainer(): Container | null {
    return this.rootContainer;
  }

  public dispose(): void {
    this.advancedTexture.dispose();
  }
}
