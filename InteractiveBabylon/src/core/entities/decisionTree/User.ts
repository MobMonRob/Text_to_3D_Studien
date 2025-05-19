import { History } from "./history/History";


export class User {
    

    constructor(history: History) {
        // TODO: Apply to Chat-Window somehow...
    }

    public async shouldDecide() {
        
        throw new Error("Not implemented yet!");
    }

    public async shouldBeNotifiedAbout(innerState: string) {
        throw new Error("Not implemented yet!");
    }
}