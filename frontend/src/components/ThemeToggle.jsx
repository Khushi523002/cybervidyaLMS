import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export function ThemeToggle({ compact = false }) {
  const { theme, toggleTheme } = useTheme();
  const icon = theme === "dark" ? <SunMedium size={18} /> : <MoonStar size={18} />;

  if (compact) {
    return (
      <button type="button" className="ghost-button" style={{ padding: "10px 14px" }} onClick={toggleTheme} title={theme === "dark" ? "Light mode" : "Dark mode"}>
        {icon}
      </button>
    );
  }

  return (
    <button type="button" className="theme-toggle" onClick={toggleTheme}>
      {icon}
      <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
