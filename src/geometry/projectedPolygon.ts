import { MultipolygonData, PolygonData } from './types'
import * as geometry from './projection'

export class ProjectedBounds {
  southWest: ProjectedPoint = new ProjectedPoint(Infinity, Infinity)
  northEast: ProjectedPoint = new ProjectedPoint(-Infinity, -Infinity)

  constructor(bounds?: {
    southWest: {x: number, y: number}
    northEast: {x: number, y: number}
  }) {
    if (bounds) {
      this.southWest = new ProjectedPoint(bounds.southWest.x, bounds.southWest.y)
      this.northEast = new ProjectedPoint(bounds.northEast.x, bounds.northEast.y)
    }
  }

  expandPoint(x: number, y: number) {
    this.southWest.x = Math.min(this.southWest.x, x)
    this.northEast.x = Math.max(this.northEast.x, x)
    this.southWest.y = Math.min(this.southWest.y, y)
    this.northEast.y = Math.max(this.northEast.y, y)
  }

  expand(bounds: ProjectedBounds) {
    this.expandPoint(bounds.northEast.x, bounds.northEast.y)
    this.expandPoint(bounds.southWest.x, bounds.southWest.y)
  }

  modifyIntersect(bounds: ProjectedBounds) {
    this.southWest.x = Math.max(this.southWest.x, bounds.southWest.x)
    this.northEast.x = Math.min(this.northEast.x, bounds.northEast.x)
    this.southWest.y = Math.max(this.southWest.y, bounds.southWest.y)
    this.northEast.y = Math.min(this.northEast.y, bounds.northEast.y)
  }

  contains(bounds: ProjectedBounds) {
    return (
      this.northEast.x >= bounds.northEast.x &&
      this.northEast.y >= bounds.northEast.y &&
      this.southWest.x <= bounds.southWest.x &&
      this.southWest.y <= bounds.southWest.y
    )
  }

  intersects(bounds: ProjectedBounds) {
    return !(
      this.northEast.x < bounds.southWest.x ||
      this.northEast.y < bounds.southWest.y ||
      this.southWest.x > bounds.northEast.x ||
      this.southWest.y > bounds.northEast.y
    )
  }

  toLineString() {
    return [
      // new ProjectedPoint(this.southWest.x, this.southWest.y),
      // new ProjectedPoint(this.northEast.x, this.southWest.y),
      // new ProjectedPoint(this.northEast.x, this.northEast.y),
      // new ProjectedPoint(this.southWest.x, this.northEast.y),
      new ProjectedPoint(this.southWest.x, this.northEast.y),
      new ProjectedPoint(this.northEast.x, this.northEast.y),
      new ProjectedPoint(this.northEast.x, this.southWest.y),
      new ProjectedPoint(this.southWest.x, this.southWest.y),
    ]
  }

  reproject(project: (x: number, y: number) => {x: number, y: number}) {
    return new ProjectedBounds({
      northEast: project(this.northEast.x, this.northEast.y),
      southWest: project(this.southWest.x, this.southWest.y),
    })
  }
}

export class ProjectedPoint {
  constructor(public x: number, public y: number) {
  }
}

export class ProjectedLineString {
  points: ProjectedPoint[]
  bounds3857: ProjectedBounds = new ProjectedBounds()

  constructor(coordinates: [number, number][]) {
    this.points = coordinates.map(coordinate => {
      this.bounds3857.expandPoint(coordinate[0], coordinate[1])

      const pair = geometry.webMercatorToLeaflet(coordinate[0], coordinate[1], 1)
      return new ProjectedPoint(pair.x, pair.y)
    })
  }
}

export class ProjectedPolygon {
  travelTime: number
  area: number
  lineStrings: ProjectedLineString[]
  bounds3857: ProjectedBounds = new ProjectedBounds()

  constructor(data: PolygonData) {
    this.travelTime = data.travelTime
    this.area = data.area

    this.lineStrings = [new ProjectedLineString(data.outerBoundary)]
    this.bounds3857.expand(this.lineStrings[0].bounds3857)

    if (data.innerBoundary) {
      data.innerBoundary.forEach(innerBoundary => {
        const lineString = new ProjectedLineString(innerBoundary)
        this.lineStrings.push(lineString)
        this.bounds3857.expand(lineString.bounds3857)
      })
    }
  }

  getOuterBoundary() {
    return this.lineStrings[0]
  }

  getInnerBoundary() {
    return this.lineStrings.slice(1)
  }
}

export class ProjectedMultiPolygon {
  polygons: {[travelTime: number]: ProjectedPolygon[]} = {}
  bounds3857: ProjectedBounds = new ProjectedBounds()

  constructor(data: MultipolygonData[]) {
    data.forEach(multipolygonData => {
      multipolygonData.polygons.forEach(polygonData => {
        const polygon = new ProjectedPolygon(polygonData)
        this.polygons[polygon.travelTime] = this.polygons[polygon.travelTime] || []
        this.polygons[polygon.travelTime].push(polygon)
        this.bounds3857.expand(polygon.bounds3857)
      })
    })
  }

  forEach(callback: (travelTime: number, polygon: ProjectedPolygon[]) => void) {
    let keys = Object.keys(this.polygons).map(key => +key).sort((a, b) => b - a)
    keys.forEach(key => callback(+key, this.polygons[<any>key]))
  }
}