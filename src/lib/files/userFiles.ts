import fs from 'fs';

export default class UserFileManager {
    path: string;

    constructor(absolutePathToStoragePath: string) {
        this.path = absolutePathToStoragePath;
    }

    #constructPathToFile(userId: string, type: string, fileId: string) {
        if (process.platform === 'win32') {
            return `${this.path}\\${userId}\\${type}\\${fileId}`;
        } else {
            return `${this.path}/${userId}/${type}/${fileId}`;
        }
    }

    #constructPathToFolder(userId: string, type: string) {
        if (process.platform === 'win32') {
            return `${this.path}\\${userId}\\${type}`;
        } else {
            return `${this.path}/${userId}/${type}`;
        }
    }

    getFile(userId: string, type: string, fileId: string) {
        return new Promise((resolve, reject) => {
            const pathToFile = this.#constructPathToFile(userId, type, fileId);

            fs.readFile(pathToFile, (err, data) => {
                if (err) {
                    reject("No such file exists.")
                }

                resolve(data.toString());
            })
        })
    }

    saveFile(userId: string, type: string, fileId: string | null, contents: string | Buffer) {
        return new Promise<string>((resolve, reject) => {
            const pathToFolder = this.#constructPathToFolder(userId, type);

            fs.readdir(pathToFolder, (err, data) => {
                let fileId_: string;

                if (err) {
                    fileId_ = '0'
                } else {
                    if (fileId !== null && data.includes(fileId)) {
                        fileId_ = fileId;
                    } else {
                        fileId_ = data.length.toString();
                    }
                }

                const pathToFile = this.#constructPathToFile(userId, type, fileId_);

                fs.writeFile(pathToFile, contents, (err) => {
                    if (err) {
                        reject("File couldn't be saved.")
                    }

                    resolve(fileId_);
                })
            })
        })
    }

    getFileList(userId: string, type: string) {
        return new Promise<string[]>((resolve, reject) => {
            const pathToFolder = this.#constructPathToFolder(userId, type);

            fs.readdir(pathToFolder, (err, data) => {
                if (err) {
                    resolve([])
                }
                resolve(data);
            })
        })
    }
}