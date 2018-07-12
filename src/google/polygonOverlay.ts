/// <reference path='../../node_modules/@types/googlemaps/index.d.ts' />

import * as svg from '../render/svg'
import {geometry, BoundingBox} from '@targomo/core'
import { MultipolygonData } from '../geometry/types'
import { ProjectedMultiPolygon, ProjectedBounds, ProjectedBoundsData } from '../geometry/projectedPolygon'
import { MinMaxSchedule } from '../util/minMaxSchedule'
import { PolygonOverlayElement } from '../overlay/polygonOverlayElement';

export class GoogleMapsPolygonOverlayOptions extends svg.PolygonRenderOptions {
}

/**
 *
 */
export class TgmGoogleMapsPolygonOverlay extends google.maps.OverlayView {
  private element: PolygonOverlayElement
  private readyResolve: () => void
  private readyPromise = new Promise(resolve => this.readyResolve = resolve)
  private options: GoogleMapsPolygonOverlayOptions

  /**
   *
   * @param map
   */
  constructor(private map: google.maps.Map, options?: Partial<GoogleMapsPolygonOverlayOptions>) {
    super()

    this.options = Object.assign(new GoogleMapsPolygonOverlayOptions(), options || {})
    this.setMap(map)
  }

  /**
   *
   */
  onAdd() {
    const map = this.map
    const overlayProjection = this.getProjection()

    this.element = new PolygonOverlayElement({
      getZoom() {
        return map.getZoom()
      },

      getViewPort(): ProjectedBoundsData {
        const bounds = map.getBounds()
        return new ProjectedBounds({
          northEast: geometry.latLngToWebMercator({
            lng: bounds.getNorthEast().lng(),
            lat: bounds.getNorthEast().lat(),
          }),
          southWest: geometry.latLngToWebMercator({
            lng: bounds.getSouthWest().lng(),
            lat: bounds.getSouthWest().lat(),
          })
        })
      },

      getElementPixels(bounds: BoundingBox): ProjectedBoundsData {
        const southWest = overlayProjection.fromLatLngToDivPixel(new google.maps.LatLng(bounds.southWest.lat, bounds.southWest.lng))
        const northEast = overlayProjection.fromLatLngToDivPixel(new google.maps.LatLng(bounds.northEast.lat, bounds.northEast.lng))
        return {northEast, southWest}
      }
    }, this.options)

    const panes = this.getPanes()
    panes.overlayMouseTarget.appendChild(this.element.initElement())

    this.readyResolve()
  }

  /**
   *
   */
  onRemove() {
    // this.divElement.parentNode.removeChild(this.divElement)
    // this.divElement = null
  }

  setData(multipolygon: MultipolygonData[]) {
    this.readyPromise.then(() => {
      this.element.setData(multipolygon)
    })
  }

  draw() {
    if (this.element) {
      this.element.draw()
    }
  }

  setInverse(inverse: boolean) {
    this.options.inverse = inverse
    this.draw()
  }

  setColors(colors: {[edgeWeight: number]: string}) {
    this.options.colors = colors
    this.draw()
  }

  setOpacity(opacity: number) {
    this.options.opacity = opacity

    if (this.element) {
      const div = this.element.getElement()
      div.style.opacity = '' + this.options.opacity || '0.5'
    }
  }

  setStrokeWidth(strokeWidth: number) {
    this.options.strokeWidth = strokeWidth
    this.draw()
  }
}
