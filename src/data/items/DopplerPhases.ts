function dopplerPhases(): {
    [key: string]: {
        [key: number]: {
            name: string,
            color: string,
        }
    }
} {
    const data = {
        "Doppler": {
            415: {
                name: "Ruby",
                color: "#E0115F"
            },
            416: {
                name: "Sapphire",
                color: "#0F52BA"
            },
            417: {
                name: "Black Pearl",
                color: "#301934"
            },
            418: {
                name: "Phase 1",
                color: "#000000"
            },
            419: {
                name: "Phase 2",
                color: "#000000"
            },
            420: {
                name: "Phase 3",
                color: "#000000"
            },
            421: {
                name: "Phase 4",
                color: "#000000"
            },
            617: {
                name: "Black Pearl",
                color: "#301934"
            },
            618: {
                name: "Phase 2",
                color: "#000000"
            },
            619: {
                name: "Sapphire",
                color: "#0F52BA"
            },
            852: {
                name: "Phase 1",
                color: "#000000"
            },
            853: {
                name: "Phase 2",
                color: "#000000"
            },
            854: {
                name: "Phase 3",
                color: "#000000"
            },
            855: {
                name: "Phase 4",
                color: "#000000"
            },
        },
        "Gamma Doppler": {
            568: {
                name: "Emerald",
                color: "#008264",
            },
            569: {
                name: "Phase 1",
                color: "#000000",
            },
            570: {
                name: "Phase 2",
                color: "#000000",
            },
            571: {
                name: "Phase 3",
                color: "#000000",
            },
            572: {
                name: "Phase 4",
                color: "#000000",
            },
            1119: {
                name: "Emerald",
                color: "#008264",
            },
            1120: {
                name: "Phase 1",
                color: "#000000",
            },
            1121: {
                name: "Phase 2",
                color: "#000000",
            },
            1122: {
                name: "Phase 3",
                color: "#000000",
            },
            1123: {
                name: "Phase 4",
                color: "#000000",
            },
        }
    }

    return data;
}

export const DopplerData = dopplerPhases();

function dopplerIndexList(): number[] {
    return [...Object.keys(DopplerData.Doppler), ...Object.keys(DopplerData["Gamma Doppler"])].map((x) => parseInt(x))
}

export const DopplerIndexes = dopplerIndexList();

export function isDoppler(paintIndex: number): boolean {
    return DopplerIndexes.includes(paintIndex);
}

// Only use after calling isDoppler first to check, otherwise you might get false results :)
export function getDopplerType(paintIndex: number): string {
    if (DopplerData.Doppler[paintIndex]) {
        return "Doppler";
    }
    
    return "Gamma Doppler";
}