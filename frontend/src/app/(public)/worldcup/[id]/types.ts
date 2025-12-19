export type ImageItem = {
    id: string;
    name: string;
    image_url: string;
};

export type TournamentInfo = {
    title: string;
    description: string | null;
};

export type GameData = {
    info: TournamentInfo;
    images: ImageItem[];
};