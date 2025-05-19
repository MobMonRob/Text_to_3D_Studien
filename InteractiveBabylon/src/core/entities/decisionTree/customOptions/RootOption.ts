import { AbortOption } from "../BaseOptions/AbortOption";
import {
  BaseSuccessors,
  Option,
  OptionEngagement,
} from "../BaseOptions/AbstractOption";
import { RollbackOption } from "../BaseOptions/RollbackOption";
import { SuccessOption } from "../BaseOptions/SuccessOption";
import { CreationOption } from "./CreationOption";
import { SelectOption } from "./SelectOption";

export interface RootEngagement extends OptionEngagement {}

interface RootSuccessors extends BaseSuccessors {
  select: SelectOption;
  create: CreationOption;
}

export class RootOption extends Option<RootEngagement, RootSuccessors> {
  override name = "Root";
  override semanticDescription: readonly string[] = [
    "start",
    "root",
    "begin",
    "initial interaction",
  ];

  public override nextOptions = {
    select: new SelectOption(),
    create: new CreationOption(),
    abort: new AbortOption(),
    rollback: new RollbackOption(),
  };

  protected override async executeEngagement(
    root: RootEngagement,
  ): Promise<void> {
    // const inference = await root.agent.inferSingleAnswer(root.initialPrompt);
    const initialPrompt = root.history.userInput.at(-1).message;

    await this.chooseNextOption(root, initialPrompt)
      .then(
        async (choice) => {
          console.log(choice);
          if (choice.matches(this.nextOptions.create)) {
            await this.nextOptions.create.engage(root);
          } else if (choice.matches(this.nextOptions.select)) {
            // TODO: Next!
            await this.nextOptions.select.engage({
              initialPrompt,
              ...root,
            });
          }
        },
        (invalidChoice) =>
          this.nextOptions.abort.engage({
            reasonToAbort: invalidChoice,
            ...root,
          }),
      ).catch((error) => {
        console.error(error);
        this.nextOptions.abort.engage({
          reasonToAbort: "Unhandled Choice not implemented yet.",
          ...root,
        });
      });
  }
}
