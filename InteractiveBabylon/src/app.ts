import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import { Engine } from "@babylonjs/core";
import { World } from "./core/entities/environment/World";
import { WorldManager } from "./core/entities/worlds/WorldManager";

class App {
  constructor() {
    // create the canvas html element and attach it to the webpage
    var canvas = this.createCanvas();
    var engine = new Engine(canvas, true);
    var scene = new World(engine, canvas); // TODO: Make interchangable

    console.log(`
      ##################################################
      ########## Starting Interactive Babylon ##########
      ##################################################`);
    // hide/show the Inspector
    console.info("🔎 To show inspector in Browser push: Shift+Ctrl+Alt+I");
    window.addEventListener("keydown", (ev) => {
      if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
        if (scene.debugLayer.isVisible()) {
          scene.debugLayer.hide();
        } else {
          scene.debugLayer.show();
        }
      }
    });

    // To keep objects from morphing/stretching.
    window.addEventListener("resize", function () {
      engine.resize();
    });

    this.createWorldManager(engine, canvas).then((worldManager) => {
      // run the main render loop
      engine.runRenderLoop(() => {
        const sceneToRender = worldManager.activeWorld;
        if (sceneToRender && sceneToRender.activeCamera) {
          sceneToRender.render();
        }
      });

      // TODO: For Debugging
      (window as any).worldManager = worldManager;
      console.log(
        "WorldManager created. Use worldManager.switchToScene('world') or worldManager.switchToScene('studio') in console.",
      );
    });
  }

  createCanvas(): HTMLCanvasElement {
    var canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.touchAction = "none"; // to disable pulling canvas around.
    canvas.id = "gameCanvas";
    document.body.appendChild(canvas);
    return canvas;
  }

  async createWorldManager(
    engine: Engine,
    canvas: HTMLCanvasElement,
    defaultWorld = "world",
  ): Promise<WorldManager> {
    var worldManager = new WorldManager(engine, canvas);

    // Mache den Manager global verfügbar für die Konsole
    // ACHTUNG: Im Produktivcode sollte man globale Variablen vermeiden,
    // aber für Debugging/Konsole ist es ok.
    (window as any).worldManager = worldManager;
    console.log(
      "WorldManager created. Use worldManager.switchToScene('world') or worldManager.switchToScene('studio') in console.",
    );

    try {
      await worldManager.switchToWorld(defaultWorld); // Lade die 'world'-Szene zuerst
    } catch (error) {
      console.error("Failed to start WorldManager:", error);
      // Hier könntest du eine Fehlermeldung anzeigen
      return Promise.reject(error);
    }

    return worldManager;
  }
}

new App();
