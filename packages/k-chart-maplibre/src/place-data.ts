export interface KChartMapLibrePlace {
    id: string;
    name: string;
    lat: number;
    lon: number;
    category?: string;
    address?: string;
    description?: string;
}

export interface KChartMapLibrePlaceParserOptions {
    invalid?: 'throw' | 'skip';
}

export interface KChartMapLibrePlaceResolverOptions<TCity, TPlace extends KChartMapLibrePlace> {
    getCityKey: (city: TCity) => string | number;
    getPlaceCityKey: (place: TPlace) => string | number;
}

const normalizePlace = <TPlace extends KChartMapLibrePlace>(
    place: TPlace,
    index: number
): TPlace => {
    const id = String(place.id ?? '').trim();
    const name = String(place.name ?? '').trim();
    const rawLat = place.lat as unknown;
    const rawLon = place.lon as unknown;
    const lat = Number(place.lat);
    const lon = Number(place.lon);

    if (
        !id ||
        !name ||
        rawLat === null ||
        rawLat === undefined ||
        rawLat === '' ||
        rawLon === null ||
        rawLon === undefined ||
        rawLon === '' ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lon)
    ) {
        throw new Error(
            `Invalid MapLibre place at index ${index}. ` +
            'id, name, lat, and lon are required.'
        );
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        throw new Error(
            `Invalid MapLibre coordinates at index ${index}: ` +
            `lat ${lat}, lon ${lon}.`
        );
    }

    return {
        ...place,
        id,
        name,
        lat,
        lon
    };
};

/**
 * Converts API or static records into validated MapLibre places.
 * Return null from the parser to intentionally omit a record.
 */
export const parseMapLibrePlaces = <TInput, TPlace extends KChartMapLibrePlace>(
    data: readonly TInput[],
    parser: (item: TInput, index: number) => TPlace | null | undefined,
    options: KChartMapLibrePlaceParserOptions = {}
): TPlace[] => {
    const places: TPlace[] = [];

    data.forEach((item, index) => {
        try {
            const parsed = parser(item, index);
            if (parsed) {
                places.push(normalizePlace(parsed, index));
            }
        } catch (error) {
            if (options.invalid !== 'skip') {
                throw error;
            }
        }
    });

    return places;
};

/**
 * Builds an indexed city-to-place resolver for createMapLibreGlobeBridge.
 */
export const createMapLibrePlaceResolver = <
    TCity,
    TPlace extends KChartMapLibrePlace
>(
    places: readonly TPlace[],
    options: KChartMapLibrePlaceResolverOptions<TCity, TPlace>
): ((city: TCity) => TPlace[]) => {
    const placesByCity = new Map<string, TPlace[]>();

    places.forEach((place) => {
        const cityKey = String(options.getPlaceCityKey(place));
        const group = placesByCity.get(cityKey);
        if (group) {
            group.push(place);
        } else {
            placesByCity.set(cityKey, [place]);
        }
    });

    return (city: TCity): TPlace[] => [
        ...(placesByCity.get(String(options.getCityKey(city))) ?? [])
    ];
};
