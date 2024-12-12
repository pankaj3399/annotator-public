"use client";
import Footer from "@/components/LandingPage/Footer";
import Header from "@/components/LandingPage/Header";
import Stars from "@/components/LandingPage/Stars";
import { ThemeProvider, useTheme } from "@/context/themeContext";
import { useState, useEffect } from "react";
import './index.css';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [starColor, setStarColor] = useState<string>("#348AC7"); 

  return (
    <ThemeProvider defaultTheme="light" storageKey="app-ui-theme">
      <ThemedLayout starColor={starColor} setStarColor={setStarColor}>
        {children}
      </ThemedLayout>
    </ThemeProvider>
  );
}

function ThemedLayout({
  children,
  starColor,
  setStarColor,
}: {
  children: React.ReactNode;
  starColor: string;
  setStarColor: (color: string) => void;
}) {
  const theme = useTheme();

  useEffect(() => {
    setStarColor(theme.theme === "dark" ? "#fff" : "#348AC7");
  }, [theme.theme, setStarColor]);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="absolute inset-0 z-0">
        <Stars color={starColor} />
      </div>

      <Header />

      <main className="relative z-10">{children}</main>

      <Footer />
    </div>
  );
}
