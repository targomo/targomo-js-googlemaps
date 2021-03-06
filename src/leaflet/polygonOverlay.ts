import * as L from 'leaflet'
import { ProjectedBounds, ProjectedBoundsData } from '../geometry/projectedPolygon'
import {PolygonOverlayElement} from '../overlay/polygonOverlayElement'
import { BoundingBox, geometry } from '@targomo/core'
import { MultipolygonData } from '../geometry/types'
import * as svg from '../svg/render'
import { PolygonRenderColorOption } from '../svg/options'

export class LeafletPolygonOverlayOptions extends svg.PolygonRenderOptionsData {
}

/**
 *
 */
export class TgmLeafletPolygonOverlay extends L.Layer {
  private element: PolygonOverlayElement
  private readyResolve: () => void
  private readyPromise = new Promise(resolve => this.readyResolve = resolve)
  private options: LeafletPolygonOverlayOptions

  /**
   *
   * @param options
   */
  constructor(options?: Partial<LeafletPolygonOverlayOptions>) {
    super()

    this.options = Object.assign(new LeafletPolygonOverlayOptions(), options || {})
  }

  /**
   *
   * @param multipolygon
   */
  async setData(multipolygon: MultipolygonData[]) {
    await this.readyPromise
    if (this.element) {
      this.element.setData(multipolygon)
    }
  }

  /**
   *
   */
  draw() {
    if (this.element) {
      L.DomUtil.setTransform(this.element.getElement(), new L.Point(0, 0), null)
      this.element.draw(true)
    }
  }

  /**
   *
   * @param map
   */
  onAdd(map: L.Map) {
    this.element = new PolygonOverlayElement({
      getZoom() {
        return map.getZoom()
      },

      getViewPort(): ProjectedBoundsData {
        const bounds = map.getBounds()
        return new ProjectedBounds({
          northEast: geometry.latLngToWebMercator({
            lng: bounds.getNorthEast().lng,
            lat: bounds.getNorthEast().lat,
          }),
          southWest: geometry.latLngToWebMercator({
            lng: bounds.getSouthWest().lng,
            lat: bounds.getSouthWest().lat,
          })
        })
      },

      getElementPixels(bounds: BoundingBox): ProjectedBoundsData {
        const northEast = map.latLngToLayerPoint(bounds.northEast)
        const southWest = map.latLngToLayerPoint(bounds.southWest)

        return {northEast, southWest}
      }
    }, this.options)

    const div = this.element.initElement()
    div.style.transformOrigin = 'center'
    L.DomUtil.addClass(div, 'leaflet-zoom-' + (true ? 'animated' : 'hide'))

    map.getPanes().overlayPane.appendChild(div)

    // const draw = () => this.draw()

    map.on('moveend', this.draw, this)
    map.on('resize',  this.draw, this)
    map.on('zoomend',  this.draw, this)

    const animated = this._map.options.zoomAnimation && L.Browser.any3d
    if (animated) {
      map.on('zoomanim', (e: L.ZoomAnimEvent) => {
        if (this.element.bounds) {

          const scale = map.getZoomScale(e.zoom, map.getZoom())

          const pos1 = (map as any)._latLngToNewLayerPoint(this.element.bounds.southWest, e.zoom, e.center).round()
          const pos2 = (map as any)._latLngToNewLayerPoint(this.element.bounds.northEast, e.zoom, e.center).round()
          const cur1 = (map as any)._latLngToNewLayerPoint(this.element.bounds.southWest, map.getZoom(), map.getCenter()).round()
          const cur2  = (map as any)._latLngToNewLayerPoint(this.element.bounds.northEast, map.getZoom(), map.getCenter()).round()

          const pos = {x: (pos1.x + pos2.x) / 2, y: (pos1.y + pos2.y) / 2}
          const cur = {x: (cur1.x + cur2.x) / 2, y: (cur1.y + cur2.y) / 2}

          L.DomUtil.setTransform(div, new L.Point(pos.x - cur.x, pos.y - cur.y), scale)
        }
      })
    }

    this.readyResolve()
    this.draw()

    return this
  }

  onRemove(): this {
    if (this.element) {
      this.element.onRemove()
      this.element = null
    }
    return this
  }

  /**
   *
   * @param inverse
   */
  setInverse(inverse: boolean) {
    this.options.inverse = inverse
    this.draw()
  }

  /**
   *
   * @param colors
   */
  setColors(colors: {[edgeWeight: number]: PolygonRenderColorOption}) {
    this.options.colors = colors
    this.draw()
  }

  /**
   *
   * @param opacity
   */
  setOpacity(opacity: number) {
    this.options.opacity = opacity

    if (this.element) {
      const div = this.element.getElement()
      div.style.opacity = this.options.opacity != null ? ('' + this.options.opacity) : '0.5'
    }
  }

  /**
   *
   * @param strokeWidth
   */
  setStrokeWidth(strokeWidth: number) {
    this.options.strokeWidth = strokeWidth
    this.draw()
  }
}

