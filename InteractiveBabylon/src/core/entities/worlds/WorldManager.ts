import { Engine } from "@babylonjs/core/Engines/engine";
import { World } from "../environment/World";
import { StudioWorld } from "./StudioWorld";
import { ToolbarView } from "../../../presentation/views/ToolbarView";
import { History } from "../decisionTree/history/History";
import { GLTF2Export } from "@babylonjs/serializers";

export type SceneFactory = (engine: Engine, canvas: HTMLCanvasElement) => World;

export class WorldManager {
  private engine: Engine;
  private canvas: HTMLCanvasElement;
  private _activeWorld: World; // single active, like user sees it.
  private sceneFactories: Map<string, SceneFactory>;
  private _loadedWorlds: Map<string, World>;

  private toolbar: ToolbarView;

  readonly history: History;

  constructor(engine: Engine, canvas: HTMLCanvasElement) {
    this.engine = engine;
    this.canvas = canvas;
    this.sceneFactories = new Map<string, SceneFactory>();

    this.registerWorld("world", (eng, can) => new World(eng, can));
    this.registerWorld("studio", (eng, can) => new StudioWorld(eng, can));

    this.history = new History();
    this._loadedWorlds = new Map<string, World>();

    this.toolbar = new ToolbarView(this);
  }

  /**
   * Registers a scene factory function with the specified name in the WorldManager.
   *
   * @param name - The unique identifier for the scene type
   * @param factory - The factory function that creates an instance of the scene
   *
   * @remarks
   * If a scene factory with the same name is already registered,
   * the existing factory will be overwritten with the new one.
   */
  public registerWorld(name: string, factory: SceneFactory): void {
    if (this.sceneFactories.has(name)) {
      console.warn(
        `WorldManager: Scene type '${name}' is already registered. Overwriting.`,
      );
    }
    this.sceneFactories.set(name, factory);
    console.log(`WorldManager: Registered scene type '${name}'.`);
  }

  public async switchToWorld(
    name: string,
    restartWithFactory: boolean = false,
    enableUserInput: boolean = true,
  ): Promise<{ showWorld: () => void }> {
    console.log(`WorldManager: Attempting to switch to scene '${name}'...`);
    // Optional:
    this.engine.displayLoadingUI();

    // Check if the world is already loaded
    if (!restartWithFactory && this._loadedWorlds.has(name)) {
      console.log(`WorldManager: Using previously loaded world '${name}'...`);
      // If there's an active world and it's different from the requested one, dispose it
      if (
        this._activeWorld && this._activeWorld !== this._loadedWorlds.get(name)
      ) {
        const oldSceneName = this._activeWorld.name;
        console.log(
          `WorldManager: Disposing previous scene '${oldSceneName}'...`,
        );
      }

      // Set the already loaded world as active
      this._activeWorld = this._loadedWorlds.get(name);
      this.toolbar.attachToNewWorld(this._activeWorld, enableUserInput);
      return Promise.resolve({ showWorld: () => this.engine.hideLoadingUI() });
    }

    const factory = this.sceneFactories.get(name);
    if (!factory) {
      console.error(`WorldManager: Scene type '${name}' not registered.`);
      return Promise.reject(`Scene type '${name}' not registered.`);
    }

    // 1. dispose old szene
    this._activeWorld = null;

    // 2. Create new scene
    try {
      console.log(`WorldManager: Creating new scene '${name}'...`);
      // Die Fabrikfunktion aufrufen, um die neue Instanz zu erstellen
      const newScene = factory(this.engine, this.canvas);
      this._activeWorld = newScene;

      // Warten, bis die Szene wirklich bereit ist (optional, aber gut für Ladevorgänge)
      // Damit das funktioniert, müssten deine Szenen-Klassen ggf. interne
      // Ladevorgänge haben und whenReadyAsync() korrekt implementieren.
      // Wenn deine Konstruktoren synchron sind, ist das await hier sehr schnell.
      await this._activeWorld.whenReadyAsync();
      this.toolbar.attachToNewWorld(this._activeWorld, enableUserInput);

      console.log(`WorldManager: Scene '${name}' created and ready.`);
      setTimeout(() => this.engine.hideLoadingUI(), 3000);

      return Promise.resolve({ showWorld: () => this.engine.hideLoadingUI() });
    } catch (error) {
      console.error(
        `WorldManager: Failed to create or initialize scene '${name}':`,
        error,
      );
      this._activeWorld = null; // Sicherstellen, dass keine halbfertige Szene aktiv ist

      // Optional: Ladebildschirm ausblenden bei Fehler
      this.engine.hideLoadingUI();
      return Promise.reject(error);
    }
  }

  public get activeWorld() {
    return this._activeWorld;
  }

  public saveActiveWorld() {
    GLTF2Export.GLBAsync(
      this.activeWorld,
      this.activeWorld.name,
    ).then((glb) => glb.downloadFiles())
      .catch((reason) =>
        console.error("Cannot export your Mesh, due to..", reason)
      );
  }
}
