export type Theme = "light" | "dark";

// index.html sets the attribute before first paint; light unless dark was chosen.
export const getTheme = (): Theme => {
  if (document.documentElement.dataset.theme === "dark") {
    return "dark";
  }
  return "light";
};

export const setTheme = (theme: Theme) => {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("lgd.theme", theme);
  } catch {
    // storage unavailable: the choice just won't survive a restart
  }
};
