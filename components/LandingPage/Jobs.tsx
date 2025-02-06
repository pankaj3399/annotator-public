'use client'
import { useState, useEffect } from "react";
import { getJobPosts } from "@/app/actions/job";
import MapComponent from "../JobMap";
import { Search, X } from "lucide-react";

interface JobPost {
    _id: string;
    title: string;
    content: string;
    lat: string;
    lng: string;
    compensation: string;
    location: string;
    category?: string;
}

interface MarkerData {
    id: string;
    coordinates: [number, number];
}

const categories = [
    'LLM BENCHMARK',
    'TRANSLATION',
    'MULTIMODALITY',
    'ACCENTS',
    'ENGLISH'
];

export default function InteractiveMap() {
    const [posts, setPosts] = useState<JobPost[]>([]);
    const [filteredPosts, setFilteredPosts] = useState<JobPost[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isSearchMode, setIsSearchMode] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [activeCategory, setActiveCategory] = useState('');

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const response = await getJobPosts({ limit: 10 });
                const parsedResponse = JSON.parse(response);

                if (!parsedResponse.success || !parsedResponse.data) {
                    setError("Failed to load job posts");
                } else {
                    setPosts(parsedResponse.data.posts);
                    setFilteredPosts(parsedResponse.data.posts);
                }
            } catch (err) {
                setError("Failed to load job posts");
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, []);

    useEffect(() => {
        filterPosts();
    }, [searchValue, activeCategory, posts]);

    const filterPosts = () => {
        let filtered = [...posts];

        // Filter by category if selected
        if (activeCategory) {
            filtered = filtered.filter(post => 
                post.category?.toLowerCase() === activeCategory.toLowerCase()
            );
        }

        // Filter by search term if in search mode
        if (isSearchMode && searchValue) {
            const searchLower = searchValue.toLowerCase();
            filtered = filtered.filter(post =>
                post.title.toLowerCase().includes(searchLower) ||
                post.location.toLowerCase().includes(searchLower) ||
                post.content?.toLowerCase().includes(searchLower)
            );
        }

        setFilteredPosts(filtered);
    };

    const handleCategoryClick = (category: string) => {
        if (activeCategory === category) {
            setActiveCategory('');
        } else {
            setActiveCategory(category);
        }
    };

    const handleSearchToggle = () => {
        setIsSearchMode(!isSearchMode);
        if (isSearchMode) {
            setSearchValue('');
        }
    };

    if (loading) return <div className="text-center">Loading job posts...</div>;
    if (error) return <div className="text-center text-red-600">{error}</div>;
    if (posts.length === 0) return <div>No job posts available</div>;

    // Convert filtered posts to markers
    const markers: MarkerData[] = filteredPosts
        .map(post => {
            const lat = parseFloat(post.lat);
            const lng = parseFloat(post.lng);

            if (!isNaN(lat) && !isNaN(lng)) {
                return { id: post._id, coordinates: [lat, lng] };
            }
            return null;
        })
        .filter((marker): marker is MarkerData => marker !== null);

    return (
        <main className="container mx-auto max-w-5xl p-8">
            {/* Search Bar */}
            <div className="mb-8 w-full max-w-4xl mx-auto">
                <div className={`
                    relative flex items-center rounded-full border border-gray-200 
                    transition-all duration-300 ease-in-out overflow-hidden
                    ${isSearchMode ? 'bg-white shadow-lg' : 'bg-transparent'}
                `}>
                    <div className={`
                        flex-1 flex items-center gap-2 px-4 h-12
                        transition-all duration-300 ease-in-out
                        ${isSearchMode ? 'w-full' : 'w-auto'}
                    `}>
                        {!isSearchMode ? (
                            categories.map((category) => (
                                <button
                                    key={category}
                                    onClick={() => handleCategoryClick(category)}
                                    className={`
                                        px-4 py-1 rounded-full text-sm font-medium 
                                        transition-all duration-200 whitespace-nowrap
                                        ${activeCategory === category 
                                            ? 'bg-black text-white' 
                                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}
                                    `}
                                >
                                    {category}
                                </button>
                            ))
                        ) : (
                            <input
                                type="text"
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                placeholder="Search jobs..."
                                className="w-full bg-transparent outline-none text-gray-700"
                                autoFocus
                            />
                        )}
                    </div>
                    
                    <button
                        onClick={handleSearchToggle}
                        className={`
                            p-3 rounded-full transition-all duration-200
                            ${isSearchMode 
                                ? 'hover:bg-gray-100' 
                                : 'bg-black text-white hover:bg-gray-800'}
                        `}
                    >
                        {isSearchMode ? <X size={20} /> : <Search size={20} />}
                    </button>
                </div>
            </div>

            {/* Map Component */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                <MapComponent posts={filteredPosts} markers={markers} />
            </div>
        </main>
    );
}