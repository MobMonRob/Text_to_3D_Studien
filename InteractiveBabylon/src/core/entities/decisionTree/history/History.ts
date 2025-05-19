import { Option } from "../BaseOptions/AbstractOption";
import { HistoryEntry } from "./HistoryEntry";

export class History {
  private history: HistoryEntry[];

  public appendToHistory(entry: HistoryEntry): History {
    // defaults..
    if (!entry.timestamp) {
      entry.timestamp = new Date();
    }

    if (!entry.type) {
      entry.type = "systemNotice";
    }

    // now append To History
    if (this.history?.length > 0) {
      entry.previousEntry = this.history[-1];
      // also allow for linked list for easy local traversal.
      this.history.push(
        Object.freeze(entry), // as history is readonly.
      );
    } else {
      this.history = [entry];
    }

    return this;
  }

  public getAllHistory() {
    const historyMemento = [...this.history];
    return Object.freeze(historyMemento);
  }

  public getHistory(ignoreHistorySeparators = true) {
    if (ignoreHistorySeparators) {
      return this.getAllHistory();
    } else {
      const endIdx = this.history
        .findIndex((entry) => entry.type === "separator");

      const slice = this.history.slice(0, endIdx);

      return Object.freeze(slice);
    }
  }

  public getHistoryEntriesBy(filters?: Partial<HistoryEntry>[]) {
    const isSelected = (entry: HistoryEntry) => {
      return filters.some((filter) => {
        return Object
          .entries(filter)
          .every(([key, value]) => entry[key] === value);
      });
    };

    return this.getAllHistory().filter(isSelected);
  }

  public getOptionEngagementCount(
    option: Option<any, any>,
    ignoreHistorySeparators = false,
  ) {
    return this.getHistory(ignoreHistorySeparators)
      .filter((entry) => entry.inContextOf?.name == option.name)
      .length;
  }

  public get userInput(): HistoryEntry[] {
    return this.getHistoryEntriesBy([
      { role: "user", type: "input" },
      { role: "user", type: "decision" },
    ]);
  }

  public get agentInput(): HistoryEntry[] {
    return this.getHistoryEntriesBy([
      { role: "agent" },
    ]);
  }
}
