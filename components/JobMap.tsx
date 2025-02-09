"use client"
import type React from "react"
import { useState, useRef, useMemo } from "react"
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
}

interface MarkerClickEvent {
  event: MouseEvent
  anchor: [number, number]
  payload: any
}

const MapComponent: React.FC<MapComponentProps> = ({ markers, posts }) => {
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null)
  const [dockPosition, setDockPosition] = useState<{ x: number; y: number; position: 'top' | 'bottom' | 'left' | 'right' } | null>(null)
  const [zoom, setZoom] = useState(11)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  // Calculate the default center based on the location with the most jobs
  const defaultCenter = useMemo(() => {
    const jobCounts = posts.reduce(
      (acc, post) => {
        const key = `${post.lat},${post.lng}`
        acc[key] = (acc[key] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const maxLocation = Object.entries(jobCounts).reduce(
      (max, [coords, count]) => {
        return count > max.count ? { coords, count } : max
      },
      { coords: "", count: 0 },
    )

    const [lat, lng] = maxLocation.coords.split(",").map(Number)
    return [lat, lng] as [number, number]
  }, [posts])

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

    // Calculate available space in different directions
    const spaceAbove = targetRect.top - mapRect.top
    const spaceBelow = mapRect.bottom - targetRect.bottom
    const spaceLeft = targetRect.left - mapRect.left
    const spaceRight = mapRect.right - targetRect.right

    // Determine optimal position
    let x = targetRect.left - mapRect.left + targetRect.width / 2
    let y = targetRect.top - mapRect.top
    let position: 'top' | 'bottom' | 'left' | 'right' = 'top'

    if (spaceAbove < 300 && spaceBelow > 300) {
      position = 'bottom'
      y = targetRect.bottom - mapRect.top
    } else if (spaceAbove < 300 && spaceRight > 400) {
      position = 'right'
      x = targetRect.right - mapRect.left
    } else if (spaceAbove < 300 && spaceLeft > 400) {
      position = 'left'
      x = targetRect.left - mapRect.left
    }

    setDockPosition({ x, y, position })
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
    <div className="relative" ref={mapContainerRef}>
      <div className="absolute top-4 left-2 z-10 flex flex-col gap-3 bg-white p-2 rounded-lg shadow-lg">
        <button className="p-2 bg-white text-black hover:bg-blue-100" onClick={() => setZoom(zoom + 1)}>
          <ZoomIn size={20} />
        </button>
        <button className="p-2 bg-white text-black hover:bg-blue-100" onClick={() => setZoom(zoom - 1)}>
          <ZoomOut size={20} />
        </button>
      </div>

      <Map height={600} width={1200} defaultCenter={defaultCenter} zoom={zoom}>
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

      {selectedMarker && dockPosition && (
        <div
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
      return 'translate(-50%, -120%)'
  }
}

export default MapComponent

