import { BaseSuccessors, Option, OptionEngagement } from "./AbstractOption";

export interface SuccessOptionEngagement extends OptionEngagement {
  finalMessage?: string;
}

export class SuccessOption extends Option<SuccessOptionEngagement> {
  public override nextOptions: null;
  protected override executeEngagement(
    success: SuccessOptionEngagement,
  ): Promise<void> {
    return Promise.resolve();
  }

  public override name: "Successfully finish decision-making process";

  override semanticDescription = [
    "success",
    "done",
  ];
}
