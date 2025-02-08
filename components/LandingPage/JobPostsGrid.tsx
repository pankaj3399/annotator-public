"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
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
        post.location.toLowerCase().includes(searchLower) ||
        post.description?.toLowerCase().includes(searchLower)
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
    <div className="w-full py-16">
      <div className="container mx-auto px-4">
        {/* Search Bar */}
        <div className="mb-12 w-full max-w-4xl mx-auto">
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

        {/* No Results Message */}
        {filteredPosts.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            No jobs found matching your criteria
          </div>
        )}

        {/* Job Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map((jobPost) => (
            <JobCard key={jobPost._id} jobPost={jobPost} />
          ))}
        </div>
      </div>
    </div>
  )
}

const JobCard = ({ jobPost }: { jobPost: any }) => {
  return (
    <div className="group relative h-[28rem] w-full overflow-hidden rounded-xl">
      <div className="absolute inset-0 h-full w-full">
      <img 
  src={jobPost.image || `${process.env.NEXT_PUBLIC_S3_BASE_URL}/images/defaultJobThumbnail.jpg`} 
  alt={jobPost.title} 
  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
/>

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      </div>
      
      <div className="absolute bottom-0 w-full p-6 space-y-4">
        <h3 className="font-bold text-2xl text-white line-clamp-2">
          {jobPost.title}
        </h3>
        
        <div className="space-y-2">
          <div className="flex items-center text-gray-200">
            <MapPinIcon className="h-5 w-5 mr-2" />
            <span className="text-sm">{jobPost.location}</span>
          </div>
          <div className="flex items-center text-gray-200">
            <DollarSignIcon className="h-5 w-5 mr-2" />
            <span className="text-sm font-semibold">${jobPost.compensation}</span>
          </div>
          <div className="flex items-center text-gray-200">
            <CalendarIcon className="h-5 w-5 mr-2" />
            <span className="text-sm">
              {`${new Date(jobPost.projectDuration.startDate).toLocaleDateString()} - ${new Date(jobPost.projectDuration.endDate).toLocaleDateString()}`}
            </span>
          </div>
        </div>

        <Link href={`/jobs/${jobPost._id}`} className="block">
          <Button 
            variant="default" 
            className="w-full bg-white hover:bg-white/90 text-black font-medium"
          >
            View Details
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default JobPostsGrid