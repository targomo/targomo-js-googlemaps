import * as L from 'leaflet';
import { TargomoClient } from '@targomo/core';

export class TgmLeafletTileLayer extends L.TileLayer {
    constructor(tgmClient: TargomoClient, basemapName: string, options: L.TileLayerOptions) {

        if (!basemapName && !tgmClient.basemaps.basemapsLookup[basemapName]) {
            throw new Error('valid style name required to access Targomo basemap');
        }

        const tileUrl = 'https://maps.targomo.com/styles/' +
            tgmClient.basemaps.basemapsLookup[basemapName] +
            '/rendered/{z}/{x}/{y}{r}.png?key=' +
            tgmClient.serviceKey;

        super(tileUrl , options);
    }

    static getTileLayerList(tgmClient: TargomoClient): {[basemapName: string]: TgmLeafletTileLayer} {
        const tileLayerList: {[basemapName: string]: TgmLeafletTileLayer} = {}
        tgmClient.basemaps.basemapNames.forEach(basemapName => {
            tileLayerList[basemapName] = new TgmLeafletTileLayer(tgmClient, basemapName, {});
        });
        return tileLayerList;
    }
}
