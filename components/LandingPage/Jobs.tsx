'use client'
import { useState, useEffect } from "react";
import { getJobPosts } from "@/app/actions/job";
import MapComponent from "../JobMap";

interface JobPost {
    _id: string;
    title: string;
    content:string;
    coordinates: string[]; // Stored as ['latitude', 'longitude']
    compensation:string;
    location:string;
}

interface MarkerData {
    id: string;
    coordinates: [number, number]; // [latitude, longitude]
}

export default function JobPostsGrid() {
    const [posts, setPosts] = useState<JobPost[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const response = await getJobPosts({ limit: 10 });
                const parsedResponse = JSON.parse(response);

                if (!parsedResponse.success || !parsedResponse.data) {
                    setError("Failed to load job posts");
                } else {
                    setPosts(parsedResponse.data.posts);
                }
            } catch (err) {
                setError("Failed to load job posts");
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, []);

    if (loading) return <div className="text-center">Loading job posts...</div>;
    if (error) return <div className="text-center text-red-600">{error}</div>;
    if (posts.length === 0) return <div>No job posts available</div>;

    // Convert posts to markers
    const markers: MarkerData[] = posts
        .map(post => {
            if (post.coordinates?.length === 2) {
                const [latStr, lngStr] = post.coordinates;
                const lat = parseFloat(latStr);
                const lng = parseFloat(lngStr);

                if (!isNaN(lat) && !isNaN(lng)) {
                    return { id: post._id, coordinates: [lat, lng] };
                }
            }
            return null;
        })
        .filter((marker): marker is MarkerData => marker !== null);

    return (
        <main className="container mx-auto max-w-5xl p-8">
            <h1 className="text-4xl text-center font-bold mb-8">Latest Jobs</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Pass markers to MapComponent */}
                <MapComponent posts={posts} markers={markers} />
            </div>
        </main>
    );
}
