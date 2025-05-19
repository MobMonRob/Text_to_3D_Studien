import { Agent, Inconclusive } from "../Agent";
import { AbortOption } from "./AbortOption";
import { RollbackOption } from "./RollbackOption";
import { History } from "../history/History";
import { WorldManager } from "../../worlds/WorldManager";

export type OptionName = string;

export interface User {
  askForInput(
    brosMessage: string,
  ): Promise<string>;
  newChatNotice(brosMessage: string): void;
}

export interface OptionEngagement {
  readonly agent: Agent;
  readonly user: User;
  readonly history: History;
  readonly worlds: WorldManager;
}

export interface BaseSuccessors {
  abort: AbortOption;
  rollback: RollbackOption;
  // success: SuccessOption;
}

// ! might have to test for self-referencing here,
// ! to prevent cycles at some point.

/**
 * Abstract base class for all executable options in the decision tree.
 */
export abstract class Option<
  EngagementInputT extends OptionEngagement /* and defaults to it.. */ =
    OptionEngagement,
  NextOptionsT extends BaseSuccessors /* and defaults to it.. */ =
    BaseSuccessors,
> {
  public readonly maxEngagementCount = 10;
  // => infin recursion break.

  public abstract readonly name: OptionName;
  // ? there is a default OptionName, as well as many different Successor Keys, used by predecessors.
  // We need both for semantic accuracy.

  public abstract readonly nextOptions: NextOptionsT;
  // TODO: Might be better i.F. to have absolute (static) & dynamic descriptions (per context)

  /**
   * Does provide semantic information about this option,
   * describing the option and allowing agent to better classify for it.
   */
  abstract readonly semanticDescription: ReadonlyArray<string>;

  constructor() {
    /*
     Nothing to construct, all type-safe.
     Alternative implementation can like call constructor INSTEAD of engage,
     but i like it better the named way :)
     */
  }

  // xxxxxxxxxx Internal xxxxxxxxxx
  /**
   * Specific implementation of the engagement logic.
   * Each subclass must implement this method.
   * * Can and should throw Exceptions on unhandled behavior.
   */
  protected abstract executeEngagement(
    engagement: EngagementInputT,
  ): Promise<void>;

  // ========== External ==========
  /**
   * Engages with this option using the provided input.
   * Generic input allows subclasses to extend their specific input type payload.
   * ? What does this do now?
   * It does catch any Exceptions and lets them be handled by previous options.
   */
  public readonly engage = async (
    payload: EngagementInputT,
  ): Promise<void> => {
    console.log(`🌳 Engaging option: '${this.name}'`);
    // Call the specific implementation

    const engagementCount = payload.history.getOptionEngagementCount(this);

    if (engagementCount > this.maxEngagementCount) {
      throw new Error(
        `You did engage '${this.name}' more than '${engagementCount}' ` +
          "times! Due to possible infinite loop, please restart context.",
      );
    }

    payload.history.appendToHistory({
      role: "developer",
      timestamp: new Date(Date.now()),
      message: `Option: ${this.name} has been engaged.`,
      inContextOf: this,
    });

    const newEngagement = payload as EngagementInputT;

    return await this.executeEngagement(newEngagement).catch(
      async (error) => {
        console.error(
          `⚠️ '${this.name}' failed or Successor rejected engagement!`,
          error,
        );
        return await this.onFailure(error as Error, newEngagement);
      },
    );
  };

  /**
   * Will be called any time a successor fails and throws an Error.
   * You can override this to handle your own successors failure in a different way.
   */
  protected async onFailure(
    error: Error,
    engagement: EngagementInputT,
  ): Promise<void> {
    const techMessage = error instanceof Error ? error.message : String(error);

    console.error(`🔥 Default onFailure for [${this.name}]: ${techMessage}`);

    // engagement.agent.summarize(techMessage, "in maximal drei Sätzen");

    engagement.history.appendToHistory(
      {
        role: "developer",
        type: "error",
        message: techMessage,
        inContextOf: this,
      },
    );

    // TODO: Perform Rollback or something, idc. now tho.
    return;
  }

  /**
   * Gets the names and semantic descriptions of all available next options.
   * @returns An array of objects containing the option name and its semantic description.
   */
  public getNextOptionsInfo(
    config?: { includeBaseOptions: boolean },
  ): { [selector: string]: string } {
    const baseOptionKeys = ["abort", "rollback"];

    const nextOptions: { [selector: string]: string } = {};

    // Iterate through all keys in nextOptions
    for (const key in this.nextOptions) {
      if (
        config && !config.includeBaseOptions && baseOptionKeys.includes(key)
      ) {
        continue;
      }

      const option = this.nextOptions[key];
      if (option && option instanceof Option) {
        const semantic = option.semanticDescription.join(", ");
        nextOptions[key] = `${option.name}, ${semantic}`;
      }
    }

    return nextOptions;
  }

  private async classifyNextOption(
    agent: Agent,
    userPrompt: string,
  ): Promise<NextOptionsT[keyof NextOptionsT] | Inconclusive> {
    console.log("Classifying User-Input:", userPrompt);

    const formattedOptions = this.getNextOptionsInfo({
      includeBaseOptions: true,
    });

    const intention = await agent.classifyIntent(
      userPrompt,
      formattedOptions,
    );

    const followUpOption = intention in this.nextOptions
      ? this.nextOptions[intention as keyof NextOptionsT]
      : "Inconclusive";

    return followUpOption;
  }

  /**
   * Does iterate maxCallsPerChoice-times to find out user intention.
   * @param {?string} [existingPrompt] Please ask user for its input, by your context!
   * @param {number} [maxCallsPerChoice=3] safeguard
   */
  public async chooseNextOption(
    engage: EngagementInputT,
    existingPrompt: string,
    recursiveCalls = 0,
    maxCallsPerChoice = 3,
  ): Promise<
    {
      matches: (option: Option<any, any>) => Option<any, any> | undefined;
      option: NextOptionsT[keyof NextOptionsT];
    }
  > {
    // circuit breaker
    if (recursiveCalls > maxCallsPerChoice) {
      return Promise.reject({
        matches: () => undefined,
      });
    }

    // Make sure you have a user-statement
    if (!existingPrompt) {
      const successors = Object.values(this.getNextOptionsInfo({
        includeBaseOptions: false,
      })).join("\n");

      const brosPrompt = await engage.agent.summarize(
        successors,
        "in maximal drei Sätzen",
        [
          "Sag dem Nutzer unbedingt zuerst, dass seine letzte Eingabe uneindeutig gewesen ist.",
          "Beschreibe daraufhin kurz die im Text beschriebenen Optionen,",
          "als Entscheidungsgrundlage für den Nutzer.",
          "Sprich den Nutzer in deiner Antwort in Du Form an.",
          "Alles auf Deutsch.",
        ].join("\n"),
      ); // TODO: Integrate History into this.

      const newUserInput = await engage.user.askForInput(brosPrompt);

      return await this.chooseNextOption(
        engage,
        newUserInput,
        ++recursiveCalls,
      );
    }

    const choice = await this.classifyNextOption(
      engage.agent,
      existingPrompt,
    );

    if (choice === "Inconclusive") {
      console.log(
        "Inconclusive nextOption choice. Ask user for clarification",
      );
      return await this.chooseNextOption(
        engage,
        "", // retry.
        ++recursiveCalls,
      );
    }

    const matchCheck = (
      option: Option<any, any>,
    ): Option<any, any> | undefined =>
      ((choice as Option).name === option.name) ? option : undefined;

    return {
      option: choice,
      matches: matchCheck,
    };
  }

  /**
   * True, if Equal name.
   */
  public isNextChoice(choice: Option) {
    return this.name == choice.name;
  }
}
