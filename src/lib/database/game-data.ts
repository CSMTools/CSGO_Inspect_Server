import config from "../../../config";
import UserFileManager from "../files/userFiles";
import * as vdf from '../vdf-parser';

export default class GameData {
    #files: UserFileManager;

    constructor() {
        this.#files = new UserFileManager(config.file_location);
    }
}