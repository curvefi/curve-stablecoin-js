import { LlammaTemplate} from "./LlammaTemplate";

export const getLlamma = (llammaId: string): LlammaTemplate => {
    return new LlammaTemplate(llammaId)
}
