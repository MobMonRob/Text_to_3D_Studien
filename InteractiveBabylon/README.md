# Interactive Uniscenes with BabylonJS

## Debugging with VSCode & Edge

1. Start Edge with debugging-port
    - `& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --remote-debugging-port=9222 --user-data-dir=remote-debug-profile`
2. Configure `launch.json` for [Browser-Debugging](https://code.visualstudio.com/docs/nodejs/browser-debugging)
3. 

## Clean Architecture

```
├── .gitignore
├── TODO.md
├── index.html
├── package-lock.json
├── package.json
├── public/                  # Statische Assets (wie bisher)
├── tsconfig.json
└── src/
    ├── core/                # Entities & Use Cases Layer
    │   ├── entities/        # Reine Datenstrukturen & Kernlogik
    │   │   ├── Asset.ts
    │   │   ├── UserSecret.ts
    │   │   ├── DecisionTreeNode.ts
    │   │   └── ...
    │   ├── use-cases/       # Anwendungslogik, orchestriert Entities & Gateways
    │   │   ├── asset/
    │   │   │   ├── LoadAssetUseCase.ts
    │   │   │   ├── SaveAssetUseCase.ts
    │   │   │   └── ListAssetsUseCase.ts
    │   │   ├── credentials/
    │   │   │   ├── StoreSecretUseCase.ts
    │   │   │   └── RetrieveSecretUseCase.ts
    │   │   ├── interaction/   # Für Entscheidungsbaum & KI
    │   │   │   ├── ProcessUserInputUseCase.ts
    │   │   │   ├── NavigateDecisionTreeUseCase.ts
    │   │   │   └── InteractWithOpenAIUseCase.ts
    │   │   └── ...
    │   └── gateways/        # Abstrakte Schnittstellen für externe Abhängigkeiten
    │       ├── IAssetRepository.ts
    │       ├── ICredentialRepository.ts
    │       ├── ILanguageModelBackend.ts
    │       ├── IDecisionTreeRepository.ts
    │       └── INotificationService.ts # z.B. um Feedback zu geben
    │
    ├── interface-adapters/  # Schicht zur Datenkonvertierung/-anpassung
    │   ├── controllers/     # Nimmt Input entgegen, ruft Use Cases auf
    │   │   ├── GuiInputController.ts  # Verarbeitet Klicks/Eingaben aus BabylonGUI
    │   │   ├── SceneInputController.ts # Verarbeitet Klicks/Interaktionen in der 3D-Szene
    │   │   └── ChatInputController.ts # Verarbeitet Texteingaben für KI
    │   ├── presenters/      # Formatiert Use Case Output für UI/Framework
    │   │   ├── ScenePresenter.ts     # Aktualisiert die BabylonJS Szene
    │   │   ├── GuiPresenter.ts       # Aktualisiert die BabylonGUI Elemente
    │   │   └── NotificationPresenter.ts # Zeigt User-Feedback an
    │   └── view-models/     # Optionale Schicht für UI-spezifische Datenstrukturen
    │
    ├── infrastructure/      # Frameworks & Drivers Layer (Implementierungsdetails)
    │   ├── babylon/         # BabylonJS spezifischer Code
    │   │   ├── sceneSetup.ts  # Initialisierung Engine, Szene, Kamera, Licht...
    │   │   ├── SceneManager.ts # Verwaltet BabylonJS Szene, Meshes, Materialien (implementiert Teile des ScenePresenters)
    │   │   ├── ModelLoaderBabylon.ts # Konkrete Implementierung für Modell-Laden mit BJS AssetManager
    │   │   └── utils/         # BabylonJS Hilfsfunktionen
    │   ├── storage/         # Konkrete Implementierungen der Repositories
    │   │   ├── IndexedDBAssetRepository.ts # Implementiert IAssetRepository
    │   │   ├── LocalStorageAssetRepository.ts # Alternative Implementierung
    │   │   ├── BrowserCredentialRepository.ts # Implementiert ICredentialRepository (nutzt CredentialManagement API)
    │   │   └── FileDecisionTreeRepository.ts  # Implementiert IDecisionTreeRepository (lädt Cytoscape JSON)
    │   ├── services/        # Konkrete Implementierungen für externe Services
    │   │   ├── AzureLanguageModelBackend.ts    # Implementiert ILanguageModelBackend
    │   │   ├── GradioServiceAdapter.ts # Falls Gradio noch genutzt wird (Adapter für alte Services)
    │   │   └── ...
    │   └── platform/        # Code, der direkt Browser-APIs nutzt (außer Storage/Credentials)
    │       └── ...
    │
    ├── ui/                    # UI-spezifische Komponenten (Teil von Frameworks & Drivers)
    │   ├── views/             # Deine bisherigen Views, angepasst an Presenters
    │   │   ├── AssetCreatorView.ts
    │   │   ├── SettingsView.ts
    │   │   ├── ToolbarView.ts
    │   │   ├── ChatView.ts        # Neue View für KI-Interaktion
    │   │   └── AbstractView.ts    # Ggf. anpassen oder entfernen
    │   ├── templates/         # GUI JSON-Definitionen (wie bisher)
    │   │   └── ...
    │   └── styles/            # CSS, falls verwendet
    │
    └── main.ts                # Haupteinstiegspunkt (ersetzt app.ts), konfiguriert Dependency Injection
```
