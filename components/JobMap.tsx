"use client"
import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Map, Marker } from "pigeon-maps"
import { ChevronRight, ZoomIn, ZoomOut } from "lucide-react"

interface JobPost {
  _id: string
  title: string
  content: string
  compensation: string
  location: string
  lat: string
  lng: string
}

interface MarkerData {
  id: string
  coordinates: [number, number]
}

interface MapComponentProps {
  markers: MarkerData[]
  posts: JobPost[]
  center: [number, number]
}

interface MarkerClickEvent {
  event: MouseEvent
  anchor: [number, number]
  payload: any
}

const MapComponent: React.FC<MapComponentProps> = ({ markers, posts, center }) => {
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null)
  const [dockPosition, setDockPosition] = useState<{ x: number; y: number; position: 'top' | 'bottom' | 'left' | 'right' } | null>(null)
  const [zoom, setZoom] = useState(8)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateDimensions = () => {
      if (mapContainerRef.current) {
        setDimensions({
          width: mapContainerRef.current.offsetWidth,
          height: mapContainerRef.current.offsetHeight
        })
      }
    }

    updateDimensions()
    const observer = new ResizeObserver(updateDimensions)
    if (mapContainerRef.current) {
      observer.observe(mapContainerRef.current)
    }

    return () => {
      if (mapContainerRef.current) {
        observer.unobserve(mapContainerRef.current)
      }
    }
  }, [])

  const calculateDockPosition = (
    markerRect: DOMRect,
    mapRect: DOMRect,
    dockWidth: number = 320,
    dockHeight: number = 300
  ) => {
    const PADDING = 20
    const positions: Array<'top' | 'bottom' | 'left' | 'right'> = ['bottom', 'top', 'right', 'left']
    
    // Calculate marker center
    const markerCenterX = markerRect.left + (markerRect.width / 2) - mapRect.left
    const markerCenterY = markerRect.top + (markerRect.height / 2) - mapRect.top

    // Try each position until we find one that fits
    for (const position of positions) {
      let x = markerCenterX
      let y = markerCenterY

      switch (position) {
        case 'bottom':
          // Adjust x to keep dock within bounds
          x = Math.min(Math.max(dockWidth / 2 + PADDING, x), mapRect.width - dockWidth / 2 - PADDING)
          y = markerRect.bottom - mapRect.top + PADDING
          if (y + dockHeight + PADDING <= mapRect.height) {
            return { x, y, position }
          }
          break

        case 'top':
          x = Math.min(Math.max(dockWidth / 2 + PADDING, x), mapRect.width - dockWidth / 2 - PADDING)
          y = markerRect.top - mapRect.top - PADDING
          if (y - dockHeight - PADDING >= 0) {
            return { x, y, position }
          }
          break

        case 'right':
          x = markerRect.right - mapRect.left + PADDING
          y = Math.min(Math.max(dockHeight / 2 + PADDING, markerCenterY), mapRect.height - dockHeight / 2 - PADDING)
          if (x + dockWidth + PADDING <= mapRect.width) {
            return { x, y, position }
          }
          break

        case 'left':
          x = markerRect.left - mapRect.left - PADDING
          y = Math.min(Math.max(dockHeight / 2 + PADDING, markerCenterY), mapRect.height - dockHeight / 2 - PADDING)
          if (x - dockWidth - PADDING >= 0) {
            return { x, y, position }
          }
          break
      }
    }

    // Fallback to centered position if no optimal position is found
    return {
      x: mapRect.width / 2,
      y: mapRect.height / 2,
      position: 'center' as 'top' | 'bottom' | 'left' | 'right'
    }
  }

  const handleMarkerClick = (markerId: string, { event }: MarkerClickEvent) => {
    if (selectedMarker === markerId) {
      setSelectedMarker(null)
      setDockPosition(null)
      return
    }

    setSelectedMarker(markerId)

    const mapContainer = mapContainerRef.current
    if (!mapContainer) return

    const target = event.target as HTMLElement
    const mapRect = mapContainer.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()

    const newPosition = calculateDockPosition(targetRect, mapRect)
    setDockPosition(newPosition)
  }

  const filteredJobs = posts.filter((post) => {
    const postLat = Number.parseFloat(post.lat)
    const postLng = Number.parseFloat(post.lng)

    return (
      postLat === markers.find((m) => m.id === selectedMarker)?.coordinates[0] &&
      postLng === markers.find((m) => m.id === selectedMarker)?.coordinates[1]
    )
  })

  return (
    <div className="relative w-full h-screen" ref={mapContainerRef}>
      <div className="absolute top-4 left-2 z-10 flex flex-col gap-3 bg-white p-2 rounded-lg shadow-lg">
        <button className="p-2 bg-white text-black hover:bg-blue-100" onClick={() => setZoom(zoom + 1)}>
          <ZoomIn size={20} />
        </button>
        <button className="p-2 bg-white text-black hover:bg-blue-100" onClick={() => setZoom(zoom - 1)}>
          <ZoomOut size={20} />
        </button>
      </div>

      <div className="w-full h-full">
        {dimensions.width > 0 && dimensions.height > 0 && (
          <Map 
            height={770}
            width={dimensions.width}
            center={center} 
            zoom={zoom}
          >
            {markers.map((marker) => (
              <Marker
                key={marker.id}
                anchor={marker.coordinates}
                width={50}
                color={selectedMarker === marker.id ? "blue" : "red"}
                onClick={(event) => handleMarkerClick(marker.id, event)}
              />
            ))}
          </Map>
        )}
      </div>

      {selectedMarker && dockPosition && (
        <div
          ref={dockRef}
          className="absolute bg-white shadow-2xl rounded-xl overflow-hidden w-80 border border-gray-200/50 
                     backdrop-blur-sm transition-all duration-300 ease-in-out"
          style={{
            left: `${dockPosition.x}px`,
            top: `${dockPosition.y}px`,
            transform: getDockTransform(dockPosition.position),
            zIndex: 1000,
          }}
        >
          <div className="bg-gradient-to-r from-blue-50 to-white px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">
                Available Jobs ({filteredJobs[0]?.location || "Unknown"})
              </h3>
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-2xl">
                {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'}
              </span>
            </div>
          </div>

          {filteredJobs.length > 0 ? (
            <div className="max-h-72 overflow-y-auto custom-scrollbar">
              {filteredJobs.map((job) => (
                <div
                  key={job._id}
                  className="group px-6 py-4 hover:bg-blue-50/40 cursor-pointer 
                           transition-all duration-200 ease-in-out border-b 
                           border-gray-100 last:border-0"
                  onClick={() => (window.location.href = `/jobs/${job._id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 mr-4">
                      <div className="flex flex-col gap-2">
                        <span className="font-medium text-gray-900 group-hover:text-blue-700">
                          {job.title}
                        </span>
                        <span className="text-sm text-gray-500 group-hover:text-gray-600 
                                     bg-gray-50 group-hover:bg-blue-100/50 px-2 py-1 
                                     rounded-full transition-colors duration-200 w-fit">
                          ${job.compensation}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 
                                         transition-transform duration-200 group-hover:translate-x-0.5" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-8 text-sm text-gray-500 text-center">
              No positions available at this location
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const getDockTransform = (position: 'top' | 'bottom' | 'left' | 'right'): string => {
  switch (position) {
    case 'top':
      return 'translate(-50%, -120%)'
    case 'bottom':
      return 'translate(-50%, 20%)'
    case 'left':
      return 'translate(-120%, -50%)'
    case 'right':
      return 'translate(20%, -50%)'
    default:
      return 'translate(-50%, -50%)'
  }
}

export default MapComponent