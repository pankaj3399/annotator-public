"use client";

import { useEffect, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateAiResponse } from "@/app/actions/aiModel";
import { useParams } from "next/navigation";
import { createJobPost } from "@/app/actions/job";
import { toast } from "sonner";
import {GoogleMap,Marker,useLoadScript} from '@react-google-maps/api'
interface JobFormData {
  projectTitle: string;
  projectDescription: string;
  requiredSkills: string;
  startDate: string;
  endDate: string;
  payRange: string;
  taskDescription: string;
  aiProvider: string;
  aiModel: string;
  apikey: string;
  location:string;
  lat:number ;
  lng:number;
}

type Provider = "OpenAI" | "Anthropic" | "Gemini";

const providerModels: Record<Provider, string[]> = {
  OpenAI: ["gpt-4", "gpt-4-turbo", "gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
  Anthropic: [
    "claude-3-5-sonnet-latest",
    "claude-3-5-sonnet-20240620",
    "claude-3-haiku-20240307",
    "claude-3-opus-latest",
    "claude-3-opus-20240229",
  ],
  Gemini: [
    "gemini-1.0-pro",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-pro",
  ],
};

const JobPostingForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPost, setGeneratedPost] = useState("");
  const [editedPost, setEditedPost] = useState("");
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [formData, setFormData] = useState<JobFormData>({
    projectTitle: "",
    projectDescription: "",
    requiredSkills: "",
    startDate: "",
    endDate: "",
    payRange: "",
    taskDescription: "",
    aiProvider: "OpenAI",
    aiModel: "gpt-4-turbo-preview",
    apikey: "",
    location:"",
    lat:0,
    lng:0
  });
  const { projectId } = useParams();
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState(""); 


  const { isLoaded } = useLoadScript({
    googleMapsApiKey: `${process.env.NEXT_PUBLIC_GOOGLE_MAP_API}`,
    libraries: ["places"], // Use 'places' library for autocomplete
  });
  // Quill module configurations
  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ script: "sub" }, { script: "super" }],
      [{ indent: "-1" }, { indent: "+1" }],
      ["link"],
      ["clean"],
    ],
  };

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "list",
    "bullet",
    "script",
    "indent",
    "link",
  ];
  // Convert markdown-style text to HTML
  const convertMarkdownToHtml = (text: string) => {
    return (
      text
        // Convert headers
        .replace(/#{3} (.*?)$/gm, "<h3>$1</h3>")
        .replace(/#{2} (.*?)$/gm, "<h2>$1</h2>")
        .replace(/# (.*?)$/gm, "<h1>$1</h1>")
        // Convert bold
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        // Convert italic
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        // Convert bullet points
        .replace(/^\* (.*?)$/gm, "<ul><li>$1</li></ul>")
        // Convert numbered lists
        .replace(/^\d+\. (.*?)$/gm, "<ol><li>$1</li></ol>")
        // Convert links
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
        // Convert line breaks
        .replace(/\n/g, "<br />")
        // Fix nested lists
        .replace(/<\/ul>\s*<ul>/g, "")
        .replace(/<\/ol>\s*<ol>/g, "")
    );
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && isLoaded && !autocomplete) {
      const input = document.getElementById("location-input") as HTMLInputElement;
      if (input) {
        const autoCompleteInstance = new google.maps.places.Autocomplete(input);
        autoCompleteInstance.setFields(["formatted_address", "geometry"]);
        autoCompleteInstance.addListener("place_changed", () => {
          const place = autoCompleteInstance.getPlace();
          handlePlaceSelect(place);
        });
        setAutocomplete(autoCompleteInstance);
      }
    }
  }, [isLoaded]);
  const handlePlaceSelect = (place: google.maps.places.PlaceResult) => {
    if (place.geometry && place.formatted_address) {
      const location = place.geometry.location;
      const lat = location?.lat() || 0;
      const lng = location?.lng() || 0;
      
      // Update both the form data and input value
      setFormData(prev => ({
        ...prev,
        location: place.formatted_address || inputValue || '',
        lat,
        lng
      }));
      setInputValue(place.formatted_address);
    }
  };

  const generatePrompt = (data: JobFormData) => {
    return `Create a professional job listing based on the following information. Use appropriate formatting with headers in markdown style (# for main headers) and bullet points (* for lists):

Project Title: ${data.projectTitle}
Project Duration: ${data.startDate} to ${data.endDate}
Compensation: ${data.payRange}

Project Overview:
${data.projectDescription}

Required Skills:
${data.requiredSkills}

Key Responsibilities:
${data.taskDescription}

Please create a well-structured, professional job posting that includes all the above information. Format it with proper headers (using #), bullet points for lists (using *), and bold text (using **) for emphasis. Use professional language and maintain a formal tone. 
Don't include any extra fields outside of mentioned above`;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const handleLocationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    // Only update formData.location if user is typing (not when selecting from dropdown)
    if (!autocomplete?.getPlace()) {
      setFormData(prev => ({
        ...prev,
        location: value
      }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log(formData)
      const prompt = generatePrompt(formData);
      if (prompt) {
        setIsAiModalOpen(true);
      }
      const response = await generateAiResponse(
        formData.aiProvider,
        formData.aiModel,
        prompt,
        projectId as string, // You'll need to provide this
        formData.apikey // You'll need to provide this
      );

      if (response) {
        const htmlContent = convertMarkdownToHtml(response);
        setGeneratedPost(htmlContent);
        setEditedPost(htmlContent);
      } else {
        throw new Error("Failed to generate post");
      }
    } catch (error) {
      console.error("Error generating job post:", error);
      const errorMessage =
        "<p>Error generating job post. Please try again.</p>";
      setGeneratedPost(errorMessage);
      setEditedPost(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      const response = await createJobPost({
        title: formData.projectTitle,
        content: editedPost, // HTML content from ReactQuill
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        compensation: formData.payRange,
        status: "published",
        projectId: Array.isArray(projectId) ? projectId[0] : projectId,
        location: formData.location,
        lat:formData.lat,
        lng:formData.lng
      });
  
      if (response.success) {
        toast.success(" Job post published successfully!");
        console.log("Job post published successfully!");
      } else {
        toast.error(` Failed to publish job post: ${response.error || "Unknown error"}`);
        console.error("Failed to publish job post:", response.error);
      }
    } catch (e) {
      toast.error("Please verify your job listing.");
      console.error("Error publishing job post:", e);
    }
  };
  

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Create New Job Listing</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">AI Provider</label>
                <Select
                  value={formData.aiProvider}
                  onValueChange={(value) =>
                    handleSelectChange("aiProvider", value)
                  }
                >
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Select AI Provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OpenAI">OpenAI</SelectItem>
                    <SelectItem value="Anthropic">Anthropic</SelectItem>
                    <SelectItem value="Gemini">Gemini</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">AI Model</label>
                <Select
                  value={formData.aiModel}
                  onValueChange={(value) =>
                    handleSelectChange("aiModel", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select AI Model" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.aiProvider === "OpenAI" && (
                      <>
                        <SelectItem value="gpt-4">GPT-4</SelectItem>
                        <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                        <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">
                          GPT-3.5 Turbo
                        </SelectItem>
                      </>
                    )}
                    {formData.aiProvider === "Anthropic" && (
                      <>
                        <SelectItem value="claude-3-5-sonnet-latest">
                          Claude 3.5 Sonnet Latest
                        </SelectItem>
                        <SelectItem value="claude-3-5-sonnet-20240620">
                          Claude 3.5 Sonnet 20240620
                        </SelectItem>
                        <SelectItem value="claude-3-haiku-20240307">
                          Claude 3 Haiku 20240307
                        </SelectItem>
                        <SelectItem value="claude-3-opus-latest">
                          Claude 3 Opus Latest
                        </SelectItem>
                        <SelectItem value="claude-3-opus-20240229">
                          Claude 3 Opus 20240229
                        </SelectItem>
                      </>
                    )}
                    {formData.aiProvider === "Gemini" && (
                      <>
                        <SelectItem value="gemini-1.0-pro">
                          Gemini 1.0 Pro
                        </SelectItem>
                        <SelectItem value="gemini-1.5-flash">
                          Gemini 1.5 Flash
                        </SelectItem>
                        <SelectItem value="gemini-1.5-pro">
                          Gemini 1.5 Pro
                        </SelectItem>
                        <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Api Key</label>
              <input
                type="text"
                name="apikey"
                value={formData.apikey}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Project Title</label>
              <input
                type="text"
                name="projectTitle"
                value={formData.projectTitle}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Project Description
              </label>
              <textarea
                name="projectDescription"
                value={formData.projectDescription}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md h-32"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Required Skills
              </label>
              <input
                type="text"
                name="requiredSkills"
                value={formData.requiredSkills}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
                placeholder="e.g., React, TypeScript, Node.js"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Pay Range</label>
              <input
                type="text"
                name="payRange"
                value={formData.payRange}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
                placeholder="e.g., $80,000 - $100,000"
                required
              />
            </div>
            <div className="space-y-2">
    <label className="block text-sm font-medium">Location</label>
    <input
      id="location-input"
      type="text"
      name="location"
      value={inputValue}
      onChange={handleLocationInputChange}
      className="w-full p-2 border rounded-md"
      placeholder="e.g., Sydney, Australia"
      required
    />
  </div>

            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Task Description
              </label>
              <textarea
                name="taskDescription"
                value={formData.taskDescription}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md h-32"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Post...
                </>
              ) : (
                "Generate Job Post"
              )}
            </Button>
          </form>

          {generatedPost && (
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle>Edit Job Post</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative h-auto min-h-[400px]">
                    <ReactQuill
                      theme="snow"
                      value={editedPost}
                      onChange={setEditedPost}
                      modules={modules}
                      formats={formats}
                      className="h-full"
                    />
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setEditedPost(generatedPost)}
                    >
                      Reset to Original
                    </Button>
                    <Button onClick={handlePublish}>Publish</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JobPostingForm;
