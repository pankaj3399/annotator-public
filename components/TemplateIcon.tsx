import Image from "next/image";
import Template from "@/public/icons/template.jpg";

export const TemplateIcon = () => {
  return <Image src={Template} alt="Book" width={18} height={18} />;
};
