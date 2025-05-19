import {
  BaseSuccessors,
  Option,
  OptionEngagement,
} from "../BaseOptions/AbstractOption";
import { CreationOption } from "./CreationOption";

export interface SelectEngagement extends OptionEngagement {
  initialPrompt: string;
}

interface SelectSuccessors extends BaseSuccessors {
  select: SelectOption; // drill-down
  create: CreationOption;
}

export class SelectOption extends Option<SelectEngagement, SelectSuccessors> {
  public override nextOptions: any;
  override semanticDescription = [
    "Wähle ein beliebiges Mesh oder Objekt in der Welt aus",
    "um es zu manipulieren, verändern, erweitern, auszutauschen oder anzusehen.",
  ];
  override name = "Objekt-Wahl";
  protected override async executeEngagement(
    select: SelectEngagement,
  ): Promise<void> {
    // Implementation
    throw new Error("TODO");
  }
}
