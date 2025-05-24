

//app/(manager)/projects/job-list/new/[projectId]/page.tsx
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
import { generateAiResponse } from "@/app/actions/aiModel"; // Ensure this path is correct
import { getProviderAIModels } from "@/app/actions/providerAIModel"; // New import
import type { FormattedAIModel } from "@/app/actions/providerAIModel"; // New import for type
import { useParams } from "next/navigation";
import { createJobPost } from "@/app/actions/job";
import { toast } from "sonner";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import { S3Upload } from "@/components/S3Upload";
// import Link from 'next/link'; // Optional: for linking to settings page

interface JobFormData {
projectTitle: string;
projectDescription: string;
requiredSkills: string;
startDate: string;
endDate: string;
payRange: string;
taskDescription: string;
selectedAiModelConfigId: string; // Replaces aiProvider, aiModel, apikey
location: string;
lat: number;
lng: number;
image: string;
}

const JobPostingForm = () => {
const [isLoading, setIsLoading] = useState(false);
const [generatedPost, setGeneratedPost] = useState("");
const [editedPost, setEditedPost] = useState("");
// const [isAiModalOpen, setIsAiModalOpen] = useState(false); // Retain if used for a modal

// State for AI model configurations
const [availableProviderModels, setAvailableProviderModels] = useState<
FormattedAIModel[]
>([]);
const [providerModelsLoading, setProviderModelsLoading] = useState(true);

const [formData, setFormData] = useState<JobFormData>({
projectTitle: "",
projectDescription: "",
requiredSkills: "",
startDate: "",
endDate: "",
payRange: "",
taskDescription: "",
selectedAiModelConfigId: "", // Initialize as empty
location: "",
lat: 0,
lng: 0,
image: "",
});
const { projectId } = useParams();
const [autocomplete, setAutocomplete] =
useState<google.maps.places.Autocomplete | null>(null);
const [inputValue, setInputValue] = useState("");

const { isLoaded } = useLoadScript({
googleMapsApiKey: `${process.env.NEXT_PUBLIC_GOOGLE_MAP_API}`,
libraries: ["places"],
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

// Fetch AI Model Configurations on component mount
useEffect(() => {
async function fetchModels() {
setProviderModelsLoading(true);
try {
const response = await getProviderAIModels();
if (response.success && response.models) {
setAvailableProviderModels(response.models);
if (response.models.length > 0) {
// Set default selected model if none is selected or current selection is invalid
setFormData((prev) => {
const currentSelectionValid = response.models!.find(
(m) => m.id === prev.selectedAiModelConfigId
);
return {
...prev,
selectedAiModelConfigId: currentSelectionValid
? prev.selectedAiModelConfigId
: response.models![0].id, // Default to the first available model
};
});
} else {
toast.info(
"No AI models configured. Please add one in your settings to generate job posts with AI."
);
setFormData((prev) => ({ ...prev, selectedAiModelConfigId: "" })); // Clear selection if no models
}
} else {
toast.error(
response.error || "Failed to load AI model configurations."
);
}
} catch (error) {
console.error("Error fetching AI model configurations:", error);
toast.error(
"An unexpected error occurred while loading AI model configurations."
);
} finally {
setProviderModelsLoading(false);
}
}
fetchModels();
}, []); // Empty dependency array ensures this runs once on mount

useEffect(() => {
if (typeof window !== "undefined" && isLoaded && !autocomplete) {
const input = document.getElementById(
"location-input"
) as HTMLInputElement;
if (input) {
const autoCompleteInstance = new google.maps.places.Autocomplete(
input
);
autoCompleteInstance.setFields(["formatted_address", "geometry"]);
autoCompleteInstance.addListener("place_changed", () => {
const place = autoCompleteInstance.getPlace();
handlePlaceSelect(place);
});
setAutocomplete(autoCompleteInstance);
}
}
}, [isLoaded, autocomplete]);

const handlePlaceSelect = (place: google.maps.places.PlaceResult) => {
if (place.geometry && place.formatted_address) {
const location = place.geometry.location;
const lat = location?.lat() || 0;
const lng = location?.lng() || 0;

setFormData((prev) => ({
...prev,
location: place.formatted_address || inputValue || "",
lat,
lng,
}));
setInputValue(place.formatted_address || "");
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

const handleLocationInputChange = (
e: React.ChangeEvent<HTMLInputElement>
) => {
const value = e.target.value;
setInputValue(value);
if (!autocomplete?.getPlace()) {
setFormData((prev) => ({
...prev,
location: value,
// Optionally reset lat/lng if user types manually after selecting a place
// lat: 0,
// lng: 0
}));
}
};

const handleSelectChange = (name: string, value: string) => {
setFormData((prev) => ({
...prev,
[name]: value,
}));
};

const handleUploadComplete = (uploadedFile: string) => {
console.log("File changed to:", uploadedFile);
setFormData({ ...formData, image: uploadedFile });
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);

  if (!formData.selectedAiModelConfigId) {
    toast.error("Please select an AI Configuration.");
    setIsLoading(false);
    return;
  }

  const selectedConfig = availableProviderModels.find(
    (m) => m.id === formData.selectedAiModelConfigId
  );

  if (!selectedConfig) {
    toast.error(
      "Selected AI configuration not found. Please refresh or re-select a model."
    );
    setIsLoading(false);
    return;
  }

  try {
    console.log("Form data for AI generation:", formData);
    console.log("Selected AI Config:", selectedConfig);

    const prompt = generatePrompt(formData);

    const response = await generateAiResponse(
      selectedConfig.provider,
      selectedConfig.model,
      prompt,
      projectId as string,
      selectedConfig.apiKey
    );

    if (response) {
      const htmlContent = convertMarkdownToHtml(response);
      setGeneratedPost(htmlContent);
      setEditedPost(htmlContent);
      toast.success("Job post generated successfully!");
    } else {
      const errorMsg = "The AI model returned an empty response. This could be due to:";
      const suggestions = [
        "• Invalid or expired API key",
        "• Model quota exceeded", 
        "• Content filtering by the AI provider",
        "• Network connectivity issues"
      ];
      
      toast.error(`${errorMsg}\n${suggestions.join('\n')}`, {
        duration: 8000
      });
      
      const errorMessage = `
        <div style="padding: 20px; border: 1px solid #ef4444; border-radius: 8px; background-color: #fef2f2;">
          <h3 style="color: #dc2626; margin-top: 0;">AI Generation Failed</h3>
          <p><strong>The AI model returned an empty response.</strong></p>
          <p>Possible causes:</p>
          <ul>
            <li>Invalid or expired API key for ${selectedConfig.provider}</li>
            <li>Model quota exceeded</li>
            <li>Content filtering by the AI provider</li>
            <li>Network connectivity issues</li>
          </ul>
          <p><strong>Solutions:</strong></p>
          <ul>
            <li>Check your API key in settings</li>
            <li>Verify your account has available credits/quota</li>
            <li>Try a different AI model</li>
            <li>Simplify your job description content</li>
          </ul>
        </div>
      `;
      setGeneratedPost(errorMessage);
      setEditedPost(errorMessage);
    }
  } catch (error: any) {
    console.error("Error generating job post:", error);
    
    // Extract more specific error information
    let errorMessage = "An error occurred while generating the job post.";
    let detailedError = "";
    let suggestions: string[] = [];

    if (error.message) {
      // Parse common AI provider errors
      if (error.message.includes("invalid_api_key") || error.message.includes("authentication")) {
        errorMessage = "API Key Authentication Failed";
        detailedError = `Your ${selectedConfig.provider} API key appears to be invalid or expired.`;
        suggestions = [
          "Verify your API key in settings",
          "Check if the API key has the required permissions",
          "Ensure the API key hasn't expired"
        ];
      } else if (error.message.includes("rate_limit") || error.message.includes("quota")) {
        errorMessage = "Rate Limit or Quota Exceeded";
        detailedError = `You've exceeded the rate limit or quota for ${selectedConfig.provider}.`;
        suggestions = [
          "Wait a few minutes before trying again",
          "Check your account's usage limits",
          "Consider upgrading your plan if needed"
        ];
      } else if (error.message.includes("model_not_found") || error.message.includes("invalid_model")) {
        errorMessage = "Invalid Model Configuration";
        detailedError = `The model "${selectedConfig.model}" is not available or invalid for ${selectedConfig.provider}.`;
        suggestions = [
          "Check if the model name is correct",
          "Verify the model is available in your region",
          "Try selecting a different model"
        ];
      } else if (error.message.includes("content_filter") || error.message.includes("safety")) {
        errorMessage = "Content Filtered";
        detailedError = "The AI provider's content filter blocked the request.";
        suggestions = [
          "Review your job description for potentially flagged content",
          "Try rephrasing the job requirements",
          "Use more general language in the description"
        ];
      } else if (error.message.includes("network") || error.message.includes("fetch")) {
        errorMessage = "Network Connection Error";
        detailedError = "Unable to connect to the AI provider's servers.";
        suggestions = [
          "Check your internet connection",
          "Try again in a few moments",
          "Contact support if the issue persists"
        ];
      } else {
        // Generic error with the actual error message
        detailedError = error.message;
        suggestions = [
          "Check your AI model configuration",
          "Verify your API key is valid and has sufficient quota",
          "Try selecting a different AI model",
          "Contact support if the issue persists"
        ];
      }
    }

    // Show user-friendly error in toast
    toast.error(`${errorMessage}: ${detailedError}`, {
      duration: 10000,
      description: suggestions.length > 0 ? suggestions.join(' • ') : undefined
    });

    // Show detailed error in the editor area
    const errorHtml = `
      <div style="padding: 20px; border: 1px solid #ef4444; border-radius: 8px; background-color: #fef2f2;">
        <h3 style="color: #dc2626; margin-top: 0;">${errorMessage}</h3>
        <p><strong>Error Details:</strong></p>
        <p style="background-color: #fee2e2; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 14px;">
          ${detailedError || error.message}
        </p>
        ${suggestions.length > 0 ? `
          <p><strong>Suggested Solutions:</strong></p>
          <ul>
            ${suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
          </ul>
        ` : ''}
        <p><strong>Provider:</strong> ${selectedConfig.provider}</p>
        <p><strong>Model:</strong> ${selectedConfig.model}</p>
        <p><strong>Configuration:</strong> ${selectedConfig.name}</p>
        <hr style="margin: 15px 0; border-color: #fca5a5;">
        <p style="font-size: 14px; color: #7f1d1d;">
          <strong>Technical Details:</strong> Check the browser console for more information.
        </p>
      </div>
    `;
    
    setGeneratedPost(errorHtml);
    setEditedPost(errorHtml);
  } finally {
    setIsLoading(false);
  }
};

const handlePublish = async () => {
try {
const validProjectId = Array.isArray(projectId)
? projectId[0]
: projectId;

if (
validProjectId === "create" ||
!/^[0-9a-fA-F]{24}$/.test(validProjectId as string)
) {
toast.error(
"Invalid project ID. Please navigate back to the project page and try again."
);
return;
}

const response = await createJobPost({
title: formData.projectTitle,
content: editedPost, // HTML content from ReactQuill
projectDescription: formData.projectDescription,
taskDescription: formData.taskDescription,
skills: formData.requiredSkills,
startDate: new Date(formData.startDate),
endDate: new Date(formData.endDate),
compensation: formData.payRange,
status: "published",
projectId: validProjectId as string,
location: formData.location,
lat: formData.lat,
lng: formData.lng,
image: formData.image,
});

if (response.success) {
toast.success(" Job post published successfully!");
console.log("Job post published successfully!");
// Optionally clear form or redirect
setFormData({ // Reset form fields after successful publish
projectTitle: "",
projectDescription: "",
requiredSkills: "",
startDate: "",
endDate: "",
payRange: "",
taskDescription: "",
selectedAiModelConfigId: availableProviderModels.length > 0 ? availableProviderModels[0].id : "", // Reset to first or none
location: "",
lat: 0,
lng: 0,
image: "",
});
setInputValue("");
setGeneratedPost("");
setEditedPost("");

} else {
toast.error(
` Failed to publish job post: ${response.error || "Unknown error"}`
);
console.error("Failed to publish job post:", response.error);
}
} catch (e) {
toast.error("Please verify your job listing details and try again.");
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
{/* New AI Configuration Select */}
<div className="space-y-2">
<label
htmlFor="aiConfigSelect"
className="block text-sm font-medium"
>
AI Configuration
</label>
<Select
value={formData.selectedAiModelConfigId}
onValueChange={(value) =>
handleSelectChange("selectedAiModelConfigId", value)
}
disabled={
providerModelsLoading || availableProviderModels.length === 0
}
>
<SelectTrigger id="aiConfigSelect" className="w-full">
<SelectValue placeholder="Select AI Configuration" />
</SelectTrigger>
<SelectContent>
{providerModelsLoading ? (
<SelectItem value="loading" disabled>
Loading configurations...
</SelectItem>
) : availableProviderModels.length === 0 ? (
<SelectItem value="no-models" disabled>
No AI models configured.
</SelectItem>
) : (
availableProviderModels.map((config) => (
<SelectItem key={config.id} value={config.id}>
{config.name} ({config.provider} - {config.model})
</SelectItem>
))
)}
</SelectContent>
</Select>
{!providerModelsLoading &&
availableProviderModels.length === 0 && (
<p className="text-sm text-muted-foreground">
Please add an AI model in your settings to enable
AI-powered job post generation.
{/* Optional: <Link href="/settings/ai-models" className="underline text-primary">Go to AI Model Settings</Link> */}
</p>
)}
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

<div className="space-y-4">
<label>Enter Job Image:</label>
<S3Upload
onUploadComplete={handleUploadComplete}
currentFile={formData.image}
accept="image/*"
uploadType="imageUploader"
label="Job Image"
></S3Upload>
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

<Button
type="submit"
className="w-full"
disabled={
isLoading ||
providerModelsLoading ||
availableProviderModels.length === 0 ||
!formData.selectedAiModelConfigId
}
>
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
className="h-full quill-editor-container" // Added a class for potential custom styling
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
{/* Optional: Add some CSS for Quill editor height if needed */}
<style jsx global>{`
.quill-editor-container .ql-container {
min-height: 300px; /* Adjust as needed */
height: auto;
}
.quill-editor-container .ql-editor {
min-height: 300px; /* Adjust as needed */
height: auto;
}
`}</style>
</div>
);
};

export default JobPostingForm;