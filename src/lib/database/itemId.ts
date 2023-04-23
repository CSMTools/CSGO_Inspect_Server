export function createItemID(killeaterscoretype: number | null, defIndex: number, paintIndex: number, rarity: number, quality: number, paintWear: number): string {
    let id = '';

    id += formatKillEaterType(killeaterscoretype);
    id += formatInt(defIndex, 3);
    id += formatInt(paintIndex, 3);
    id += formatInt(rarity, 2);
    id += formatInt(quality, 2);
    id += formatPaintWear(paintWear);

    return id;
}

function formatKillEaterType(type: number | null): number {
    if (type === null) {
        return 0;
    }

    return type + 1;
}

function formatPaintWear(float: number): string {
    if (float >= 1) {
        return '100000000000000000'
    }
    if (float <= 0) {
        return '000000000000000000'
    }

    let fling = float.toString();

    fling = fling.slice(2, fling.length-1);

    fling = formatFloatDecimals(fling, 17);

    return fling;
}

function formatInt(int: number, digits: number): string {
    // Make sure its an int and not a float
    const strint = Math.round(int).toString();

    if (strint.length < digits) {
        return '0'.repeat(digits-strint.length) + strint;
    }
    if (strint.length > digits) {
        return strint.slice(0, digits-1);
    }

    return strint;
}

function formatFloatDecimals(floatDec: string, digits: number): string {
    if (floatDec.length < digits) {
        return floatDec + '0'.repeat(digits-floatDec.length);
    }
    if (floatDec.length > digits) {
        return floatDec.slice(0, digits-1);
    }

    return floatDec;
}