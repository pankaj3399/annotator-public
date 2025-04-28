import Image from "next/image";
import Template from "@/public/icons/template.jpg";

export const TemplateIcon = () => {
  return <Image src={Template} alt="Book" width={17} height={17} className="mr-3" />;
};
