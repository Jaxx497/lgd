import { createRoot } from "react-dom/client";
import App from "./components/app";
import { keepAliveWhileDownloading } from "./keep-alive";

keepAliveWhileDownloading();
createRoot(document.querySelector("#root")!).render(<App />);
