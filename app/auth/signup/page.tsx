"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import InvitationStep from "@/components/invitationStep";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Combobox from "@/components/ui/combobox";
import { domains, languages, locations } from "@/lib/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Pencil,
  Building2,
  CheckCircle2,
  DollarSign,
  Clock,
  Database,
  FileSpreadsheet,
  Globe,
  MapPin,
  Mail,
} from "lucide-react";
import MultiCombobox from "@/components/ui/multi-combobox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getTestTemplateTasks, createTestTasks } from "@/app/actions/task";

interface Option {
  value: string;
  label: string;
}

type Step = "role" | "invitation" | "details";

export default function AuthPageComponent() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("role");
  const [invitationMode, setInvitationMode] = useState<"enter" | "request">(
    "enter"
  );
  const [isRequestSubmitted, setIsRequestSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "",
    name: "",
    phone: "",
    domain: [] as string[],
    lang: [] as string[],
    location: "",
    invitationCode: "",
    linkedin: "", // Add these optional fields
    resume: "", // to capture them from the request
    nda: "",
  });

  const domainOptions: Option[] = domains.map((domain) => ({
    value: domain.toLowerCase(),
    label: domain,
  }));
  const languageOptions: Option[] = languages.map((lang) => ({
    value: lang.toLowerCase(),
    label: lang,
  }));
  const locationOptions: Option[] = locations.map((location) => ({
    value: location.toLowerCase(),
    label: location,
  }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleRoleSelect = (selectedRole: "annotator" | "project manager") => {
    setFormData({ ...formData, role: selectedRole });
    setStep(selectedRole === "project manager" ? "invitation" : "details");
  };

  async function assignTestTasksToAnnotator(annotatorId: string) {
    console.log("Assigning test tasks to annotator:", annotatorId);
    try {
      const testTasksResponse = await getTestTemplateTasks();
      const testTasksData = JSON.parse(testTasksResponse);
      console.log("Task data:", JSON.stringify(testTasksData, null, 2));

      if (!testTasksData.success || !testTasksData.tasks.length) {
        console.log("No test tasks available for assignment");
        return;
      }

      console.log("New Annotator ID:", annotatorId);

      // Prepare tasks for the new annotator
      const tasksToCreate = testTasksData.tasks.map((testTask: any) => {
        // Use mongoose.Types.ObjectId to ensure proper ID formatting
        const task = {
          project: testTask.project._id,
          name: testTask.name.replace("undefined", ""),
          content: testTask.content,
          timer: testTask.timer || 0,
          annotator: annotatorId, // Ensure this is a valid MongoDB ObjectId
          reviewer: null,
          project_Manager: testTask.project_Manager,
          submitted: false,
          status: "pending",
          timeTaken: 0,
          feedback: "",
          ai: null, // Add this field as it's in your schema
        };

        // Log each task creation
        console.log("Created task object:", JSON.stringify(task, null, 2));
        return task;
      });

      // Log the final array of tasks to create
      console.log(
        "Final tasks to create:",
        JSON.stringify(tasksToCreate, null, 2)
      );

      // Create the tasks and await the result
      const result = await createTestTasks(tasksToCreate);

      // Log the result from task creation
      console.log("Task creation result:", result);

      // Parse and return the result
      const parsedResult = JSON.parse(result);

      // Verify the created tasks have annotator field
      if (parsedResult.success) {
        console.log(
          "Created tasks with annotators:",
          parsedResult.tasks.map((task: any) => ({
            id: task._id,
            annotator: task.annotator,
          }))
        );
      }

      return parsedResult;
    } catch (error) {
      console.error("Error assigning test tasks:", error);
      throw new Error(`Failed to assign test tasks: ${(error as any).message}`);
    }
  }

  const handleInvitationRequest = async () => {
    try {
      const res = await fetch("/api/auth/request-invitation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: formData.email }),
      });

      if (res.ok) {
        setIsRequestSubmitted(true);
        toast({
          title: "Request submitted",
          description:
            "We'll review your request and send an invitation code to your email if approved.",
        });
      } else {
        const data = await res.json();
        toast({
          variant: "destructive",
          title: "Request failed",
          description: data.error,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Request failed",
        description: "An unexpected error occurred. Please try again.",
      });
    }
  };

  const verifyInvitationCode = async () => {
    try {
      const res = await fetch("/api/auth/verify-invitation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: formData.invitationCode }),
      });

      if (res.ok) {
        setStep("details");
      } else {
        const data = await res.json();
        toast({
          variant: "destructive",
          title: "Invalid code",
          description:
            data.error || "The invitation code is invalid or expired.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: "An unexpected error occurred. Please try again.",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.role === "annotator") {
      if (
        formData.domain.length === 0 ||
        formData.lang.length === 0 ||
        formData.location === ""
      ) {
        toast({
          variant: "destructive",
          title: "Uh oh! Something went wrong.",
          description: "Please fill in all the fields.",
        });
        return;
      }
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body:
          formData.role === "annotator"
            ? JSON.stringify(formData)
            : JSON.stringify({
                email: formData.email,
                password: formData.password,
                role: formData.role,
                name: formData.name,
                invitationCode: formData.invitationCode,
                linkedin: "",
                resume: "",
                nda: "",
              }),
      });

      if (res.status === 201) {
        const userData = await res.json();

        if (userData) {
          console.log("User ID is undefined:", userData);
        }
      
        if (formData.role === "annotator") {
          try {
            await assignTestTasksToAnnotator(userData.userId);
            toast({
              title: "Account created with test tasks.",
              description: "You can now log in and start with your test tasks.",
            });
          } catch (error) {
            console.error("Error assigning test tasks:", error);
            toast({
              title: "Account created.",
              description:
                "Account created but there was an issue assigning test tasks. Please contact support.",
            });
          }
        } else {
          toast({
            title: "Account created.",
            description: "You can now log in with your new account.",
          });
        }

        router.push("/auth/login");
      } else {
        const data = await res.json();
        toast({
          variant: "destructive",
          title: "Uh oh! Something went wrong.",
          description: data.error,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "An unexpected error occurred.",
      });
    }
  };

  if (step === "role") {
    return (
      <div className="h-screen flex justify-center items-center">
        <div>
          <h1 className="text-4xl font-bold text-left mb-8">
            What's Your Mission?
          </h1>
          <p className="text-left mb-8 text-muted-foreground">
            Choose the role that aligns with your goals.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <Card
              className="cursor-pointer hover:border-primary"
              onClick={() => handleRoleSelect("annotator")}
            >
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Pencil className="mr-2 h-6 w-6" />
                  Domain Expert
                </CardTitle>
                <CardDescription>
                  Sign up and earn on your terms.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="mt-4 space-y-2">
                  <li className="flex items-center">
                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                    Complete meaningful tasks and get paid fast.
                  </li>
                  <li className="flex items-center">
                    <DollarSign className="mr-2 h-4 w-4 text-green-500" />
                    Work whenever, wherever - total flexibility.
                  </li>
                  <li className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-green-500" />
                    Your skills, your schedule, your rewards.
                  </li>
                </ul>
              </CardContent>
            </Card>
            <Card
              className="cursor-pointer hover:border-primary"
              onClick={() => handleRoleSelect("project manager")}
            >
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="mr-2 h-6 w-6" />
                  Project Manager
                </CardTitle>
                <CardDescription>I need data for my projects</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="mt-4 space-y-2">
                  <li className="flex items-center">
                    <Database className="mr-2 h-4 w-4 text-blue-500" />
                    Get data labeled
                  </li>
                  <li className="flex items-center">
                    <FileSpreadsheet className="mr-2 h-4 w-4 text-blue-500" />
                    Run surveys
                  </li>
                  <li className="flex items-center">
                    <Globe className="mr-2 h-4 w-4 text-blue-500" />
                    Collect online data
                  </li>
                  <li className="flex items-center">
                    <MapPin className="mr-2 h-4 w-4 text-blue-500" />
                    Gather field data
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (step === "invitation") {
    return (
      <InvitationStep
        formData={formData}
        handleChange={handleChange}
        verifyInvitationCode={verifyInvitationCode}
        handleInvitationRequest={handleInvitationRequest}
        isRequestSubmitted={isRequestSubmitted}
        invitationMode={invitationMode}
        setInvitationMode={setInvitationMode}
        onBack={() => setStep("role")}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div
        className={`bg-white p-8 ${
          formData.role === "annotator" ? "max-w-xl" : "max-w-md"
        } w-full`}
      >
        <h2 className="text-4xl font-bold text-center mb-6">Sign Up</h2>
        <form
          onSubmit={handleSubmit}
          className={`grid ${
            formData.role === "annotator" ? "grid-cols-2" : "grid-cols-1"
          } gap-6`}
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
              disabled={
                formData.role === "project manager" &&
                invitationMode === "request" &&
                isRequestSubmitted
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              minLength={6}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </div>
          {formData.role === "annotator" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain">Domain</Label>
                <MultiCombobox
                  options={domainOptions}
                  value={formData.domain}
                  onChange={(value) =>
                    setFormData({ ...formData, domain: value })
                  }
                  placeholder="Select domain"
                  allowCustom={true}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lang">Language</Label>
                <MultiCombobox
                  options={languageOptions}
                  value={formData.lang}
                  onChange={(value) =>
                    setFormData({ ...formData, lang: value })
                  }
                  placeholder="Select language"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Combobox
                  options={locationOptions}
                  value={formData.location}
                  onChange={(value) =>
                    setFormData({ ...formData, location: value })
                  }
                  placeholder="Select location"
                />
              </div>
            </>
          )}
          <div className={formData.role === "annotator" ? "col-span-2" : ""}>
            <Button type="submit" className="w-full">
              Sign Up
            </Button>
          </div>
        </form>
        <div className="mt-4 text-center">
          <button
            className="text-sm text-gray-600 hover:underline"
            onClick={() => router.push("/auth/login")}
          >
            Already have an account? Login
          </button>
        </div>
      </div>
    </div>
  );
}
