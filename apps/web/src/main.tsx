import { RouterProvider } from "@tanstack/react-router";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { getRouter } from "./router";

const router = getRouter();
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function App() {
  if (PUBLISHABLE_KEY) {
    return (
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <RouterProvider router={router} />
      </ClerkProvider>
    );
  }
  return <RouterProvider router={router} />;
}

createRoot(document.getElementById("root")!).render(<App />);
