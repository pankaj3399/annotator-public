'use client'
import React, { useState, useRef } from 'react';
import { Map, Marker } from 'pigeon-maps';
import { ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

interface JobPost {
    _id: string;
    title: string;
    content: string;
    compensation: string;
    location: string;
    lat: string; // Latitude as a string
    lng: string; // Longitude as a string
}

interface MarkerData {
    id: string;
    coordinates: [number, number]; // [latitude, longitude]
}

interface MapComponentProps {
    markers: MarkerData[];
    posts: JobPost[];
}

interface MarkerClickEvent {
    event: MouseEvent;
    anchor: [number, number];
    payload: any;
}

const MapComponent: React.FC<MapComponentProps> = ({ markers, posts }) => {
    const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
    const [dockPosition, setDockPosition] = useState<{ x: number; y: number } | null>(null);
    const [zoom, setZoom] = useState(11);
    const mapContainerRef = useRef<HTMLDivElement>(null);

    const handleMarkerClick = (markerId: string, { event }: MarkerClickEvent) => {
        if (selectedMarker === markerId) {
            setSelectedMarker(null);
            setDockPosition(null);
            return;
        }

        setSelectedMarker(markerId);
        
        const mapContainer = mapContainerRef.current;
        if (!mapContainer) return;

        const target = event.target as HTMLElement;
        const mapRect = mapContainer.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        
        setDockPosition({
            x: targetRect.left - mapRect.left + targetRect.width / 2,
            y: targetRect.top - mapRect.top
        });
    };

    // Filter the jobs based on the selected marker's coordinates
    const filteredJobs = posts.filter(post => {
        const postLat = parseFloat(post.lat); // Convert lat from string to number
        const postLng = parseFloat(post.lng); // Convert lng from string to number
        
        return postLat === markers.find(m => m.id === selectedMarker)?.coordinates[0] &&
               postLng === markers.find(m => m.id === selectedMarker)?.coordinates[1];
    });

    return (
        <div className="relative" ref={mapContainerRef}>
            {/* Zoom Buttons */}
            <div className="absolute top-4 left-2 z-10 flex flex-col gap-3 bg-white p-2 rounded-lg shadow-lg">
                <button
                    className="p-2 bg-white text-black hover:bg-blue-100"
                    onClick={() => setZoom(zoom + 1)}
                >
                    <ZoomIn size={20} />
                </button>
                <button
                    className="p-2 bg-white text-black hover:bg-blue-100"
                    onClick={() => setZoom(zoom - 1)}
                >
                    <ZoomOut size={20} />
                </button>
            </div>

            <Map height={600} width={1200} defaultCenter={[50.879, 4.6997]} zoom={zoom}>
                {markers.map(marker => (
                    <Marker
                        key={marker.id}
                        anchor={marker.coordinates}
                        width={50}
                        color={selectedMarker === marker.id ? "blue" : "red"}
                        onClick={(event) => handleMarkerClick(marker.id, event)}
                    />
                ))}
            </Map>

            {/* Enhanced Floating Job Dock with Custom Scrollbar */}
            {selectedMarker && dockPosition && (
                <div 
                    className="absolute bg-white shadow-2xl rounded-xl overflow-hidden w-80 border border-gray-200/50 backdrop-blur-sm"
                    style={{
                        left: `${dockPosition.x}px`,
                        top: `${dockPosition.y}px`,
                        transform: 'translate(-50%, -120%)',
                        zIndex: 1000
                    }}
                >
                    <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-3 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-800">Available Positions ({posts[0].location})</h3>
                    </div>
                    
                    {filteredJobs.length > 0 ? (
                        <div 
                            className="max-h-72 overflow-y-auto [scrollbar-width:thin] 
                                     [scrollbar-color:rgba(203,213,225,0.4)_transparent] 
                                     hover:[scrollbar-color:rgba(203,213,225,0.6)_transparent]
                                     [-webkit-scrollbar:thin] 
                                     [-webkit-scrollbar-track:transparent] 
                                     [&::-webkit-scrollbar]:w-2
                                     [&::-webkit-scrollbar-thumb]:rounded-full
                                     [&::-webkit-scrollbar-thumb]:bg-slate-300/40
                                     hover:[&::-webkit-scrollbar-thumb]:bg-slate-300/60
                                     [&::-webkit-scrollbar-track]:rounded-full"
                        >
                            {filteredJobs.map(job => (
                                <div 
                                    key={job._id}
                                    className="group px-6 py-4 hover:bg-gray-50/80 cursor-pointer 
                                             transition-all duration-200 ease-in-out border-b 
                                             border-gray-100 last:border-0"
                                    onClick={() => window.location.href = `/jobs/${job._id}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 mr-4">
                                            <div className="flex items-center gap-3">
                                                <span className="font-medium text-gray-900 group-hover:text-gray-700">
                                                    {job.title}
                                                </span>
                                                <span className="text-sm text-gray-500 group-hover:text-gray-600 bg-gray-50 
                                                               group-hover:bg-gray-100/80 px-2 py-0.5 rounded-full 
                                                               transition-colors duration-200">
                                                    ${job.compensation}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight 
                                            className="h-5 w-5 text-gray-400 group-hover:text-gray-500 
                                                     transition-transform duration-200 group-hover:translate-x-0.5" 
                                        />
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
    );
};

export default MapComponent;
