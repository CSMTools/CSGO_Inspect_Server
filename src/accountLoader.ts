import fs from 'fs';
import { LoginConfig } from './lib/types/BotTypes';

export default function getAccounts() {
    const accounts: LoginConfig[] = [];
    if (!fs.existsSync('./accounts.txt')) {
        throw new Error('No accounts.txt file in root of server.');
    }

    const file = fs.readFileSync('./accounts.txt').toString();

    let line = 0;

    for (const account of file.split('\n')) {
        line++;

        const details = account.split(':');

        if (details.length !== 3) {
            throw new Error('Invalid account details at line: ' + line);
        }

        accounts.push({
            user: details[0],
            pass: details[1],
            auth: details[2]
        })
    }

    return accounts;
}