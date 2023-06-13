export type SteamFriend = {
    steamId: string,
    avatar_hash: string
}

export type SetIndex = {
    [skinIdentifier: string]: { // skinIdentifier is like [hy_blueprint_white]weapon_bizon ([paint_kit.name]item_class)
        set: ItemSet;
        rarity: number;
    }
}

export type ItemSet = {
    name: string;
    set_description: string;
    original_name: string;
    is_collection: "1" | "0";
    items: {
        [item: string]: "1";
    }
}