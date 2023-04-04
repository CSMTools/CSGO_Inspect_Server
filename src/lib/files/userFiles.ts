import fs from 'fs';

export default class UserFileManager {
    path: string;

    constructor(absolutePathToStoragePath: string) {
        this.path = absolutePathToStoragePath;
    }

    #constructPathToFile(userId: string, type: string, fileId: string) {

    }

    getFile(userId: string, type: string, fileId: string) {
        return new Promise((resolve, reject) => {

        })
    }
}