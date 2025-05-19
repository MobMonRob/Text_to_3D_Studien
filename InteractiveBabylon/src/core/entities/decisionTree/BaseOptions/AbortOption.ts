import { BaseSuccessors, Option, OptionEngagement } from "./AbstractOption";

export interface AbortOptionEngagement extends OptionEngagement {
  reasonToAbort?: string;
}

export class AbortOption extends Option<AbortOptionEngagement> {
  public override nextOptions: BaseSuccessors = null;

  protected override executeEngagement(
    engagement: AbortOptionEngagement,
  ): Promise<void> {
    const reason = engagement.reasonToAbort ?? "unknown reason";
    const abortMsg = ` 🌳 Aborting decision making, due to ${reason}.`;
    console.log(abortMsg);

    if (engagement.worlds.activeWorld.name == "StudioWorld") {
      engagement.worlds.switchToWorld("world");
    }

    return Promise.reject(abortMsg);
  }

  public override name: "Abort decision-making process";

  override semanticDescription = [
    "abort",
    "stop",
    "cancel",
    "exit",
    "quit",
  ];
}
