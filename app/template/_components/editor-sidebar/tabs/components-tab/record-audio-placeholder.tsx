import { EditorBtns } from "@/lib/constants";
import { AudioLinesIcon, Image, Mic } from "lucide-react";
import React from "react";

const RecordAudioPlaceholder = () => {
  return <Mic size={40} className="text-muted-foreground" />;
};

export default RecordAudioPlaceholder;
