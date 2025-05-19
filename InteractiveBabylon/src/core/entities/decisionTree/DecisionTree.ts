import { History } from "./history/History";
import { Agent } from "./Agent";
import { RootEngagement, RootOption } from "./customOptions/RootOption";
import { User } from "./BaseOptions/AbstractOption";
import { WorldManager } from "../worlds/WorldManager";

export class DecisionTree {
  readonly worlds: WorldManager;
  readonly history: History;
  readonly agent: Agent;

  constructor(worlds: WorldManager, history: History) {
    this.worlds = worlds;
    this.history = history;

    this.agent = new Agent(
      this.history,
    ); // only one Agent-Session.
  }

  public async start(
    user: User,
  ): Promise<void> {
    try {
      const init: RootEngagement = {
        agent: this.agent,
        user,
        history: this.history,
        worlds: this.worlds,
      };

      return await new RootOption().engage(init);

    } catch (error) {
      console.error("Error in decision tree:", error);
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);

      const userErrorMessage = errorMessage.trim() != ""
        ? await this.agent.summarize(
          errorMessage,
          "in maximal fünf Sätzen",
          "Text ist Fehler-Nachricht. Erkläre Nutzer in eigenen Worten, warum deswegen abgebrochen werden muss.",
        )
        : "Agent not responding!";

      this.history.appendToHistory({
        role: "developer",
        type: "error",
        message: userErrorMessage,
      });

      user.newChatNotice(userErrorMessage);
    }

    this.history.appendToHistory({
      role: "developer",
      type: "separator",
      message: "Done with Decision Tree",
    });
  }
}
