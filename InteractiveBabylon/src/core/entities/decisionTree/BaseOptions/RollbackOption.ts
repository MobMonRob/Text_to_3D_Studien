import { Option, OptionEngagement } from "./AbstractOption";

export interface RollbackOptionEngagement extends OptionEngagement {
}

export class RollbackOption extends Option<
  RollbackOptionEngagement
> /* not possible to determine successors at compile-time,
    thats why the general setup is primarily static to history. */ {
  public override nextOptions = null;
  public override name = "Rollback in history";

  override semanticDescription = [
    "undo",
    "revert",
    "rollback",
    "revert steps",
    "go back steps",
    "jump back",
    "back to",
    "return to",
  ];

  protected override executeEngagement(
    _engagement: RollbackOptionEngagement,
  ): Promise<void> {
    // TODO:
    // ? this engagement should allow for static rollback parameters
    // ? as well as evaluating rollback prompts.
    // ? Those are applied to provided history and rolled back to spot,
    // ? by linearly appending to history.
    // * unless you rollback out of history, then restart or abort.

    return this.nextOptions.abort.engage({
      reasonToAbort: `${this.name} not implemented yet.`,
    });
  }
}
