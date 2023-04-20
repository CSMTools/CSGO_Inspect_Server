export type Proxy = {
    protocol: string,
    host:     string,
    port:     string
}

export type UYItem = {
    assetid:   string,
    description: UYItemDescription
}

export type UYItemDescription = {
    inspectLink: string | null,
    commodity: number,
    currency: number
}