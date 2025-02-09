"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { getJobPosts } from "@/app/actions/job"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { CalendarIcon, MapPinIcon, DollarSignIcon, Search, X } from "lucide-react"

const categories = [
  'LLM BENCHMARK',
  'TRANSLATION',
  'MULTIMODALITY',
  'ACCENTS',
  'ENGLISH'
];

const JobPostsGrid = () => {
  const [jobPosts, setJobPosts] = useState<any[]>([])
  const [filteredPosts, setFilteredPosts] = useState<any[]>([])
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [activeCategory, setActiveCategory] = useState('')

  useEffect(() => {
    const fetchJobPosts = async () => {
      const data = await getJobPosts({ limit: 10 })
      const parsedResponse = JSON.parse(data)
      setJobPosts(parsedResponse.data.posts)
      setFilteredPosts(parsedResponse.data.posts)
    }

    fetchJobPosts()
  }, [])

  useEffect(() => {
    filterPosts()
  }, [searchValue, activeCategory, jobPosts])

  const filterPosts = () => {
    let filtered = [...jobPosts]

    // Filter by category if selected
    if (activeCategory) {
      filtered = filtered.filter(post => 
        post.category?.toLowerCase() === activeCategory.toLowerCase()
      )
    }

    // Filter by search term if in search mode
    if (isSearchMode && searchValue) {
      const searchLower = searchValue.toLowerCase()
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(searchLower) ||
        post.location.toLowerCase().includes(searchLower)
      )
    }

    setFilteredPosts(filtered)
  }

  const handleCategoryClick = (category: string) => {
    if (activeCategory === category) {
      setActiveCategory('')
    } else {
      setActiveCategory(category)
    }
  }

  const handleSearchToggle = () => {
    setIsSearchMode(!isSearchMode)
    if (isSearchMode) {
      setSearchValue('')
    }
  }

  return (
    <div className="w-full py-24">
      <div className="container mx-auto px-4">
        {/* Search Bar */}
        <div className="mb-12 w-full max-w-5xl mx-auto">
          <div className={`
            relative flex items-center rounded-full border border-gray-300 
            transition-all duration-300 ease-in-out overflow-hidden
            ${isSearchMode ? 'bg-white shadow-xl' : 'bg-transparent'}
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

        {/* No Results Message */}
        {filteredPosts.length === 0 && (
          <div className="text-center text-gray-500 py-16 text-lg">
            No jobs found matching your criteria
          </div>
        )}

        {/* Job Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {filteredPosts.map((jobPost) => (
            <JobCard key={jobPost._id} jobPost={jobPost} />
          ))}
        </div>
      </div>
    </div>
  )
}

const JobCard = ({ jobPost }: { jobPost: any }) => {
  // Format date range
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });
  }

  const dateRange = jobPost.projectDuration ? 
    `${formatDate(jobPost.projectDuration.startDate)} - ${formatDate(jobPost.projectDuration.endDate)}` : 
    null;

  return (
    <Link href={`/jobs/${jobPost._id}`}>
      <div className="group bg-white overflow-hidden cursor-pointer hover:shadow-xl rounded-2xl transition-all duration-300 border border-gray-100">
        {/* Image Container */}
        <div className="relative h-56 w-full overflow-hidden">
          <img 
            src={jobPost.image || `${process.env.NEXT_PUBLIC_S3_BASE_URL}/images/defaultJobThumbnail.jpg`} 
            alt={jobPost.title} 
            className="w-full h-full object-cover transition-transform duration-300 rounded-2xl group-hover:scale-105"
          />
          {/* Location Overlay */}
          {jobPost.location && (
            <div className="absolute top-4 left-4 bg-black/80 text-white px-4 py-2 rounded-full flex items-center text-sm font-medium backdrop-blur-sm">
              <MapPinIcon className="h-4 w-4 mr-2" />
              <span>{jobPost.location}</span>
            </div>
          )}
        </div>
        
        {/* Content Container */}
        <div className="p-6 space-y-4">
          <h3 className="font-bold text-xl text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors duration-200">
            {jobPost.title}
          </h3>
          
          <div className="space-y-3">
            {jobPost.compensation && (
              <div className="flex items-center text-gray-700">
                <DollarSignIcon className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">{jobPost.compensation}</span>
              </div>
            )}
            
            {dateRange && (
              <div className="flex items-center text-gray-700">
                <CalendarIcon className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">{dateRange}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

export default JobPostsGrid