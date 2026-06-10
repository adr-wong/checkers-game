import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { isClerkEnabled } from "~/lib/clerk";
import "../styles/global.css";

export const Route = createRootRoute({
  component: RootComponent,
});

function AuthHeader() {
  if (!isClerkEnabled) return null;
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      padding: '0.5rem 1rem',
      zIndex: 9999,
      display: 'flex',
      gap: '0.5rem',
      alignItems: 'center',
      fontFamily: 'sans-serif',
    }}>
      <SignedIn>
        <UserButton appearance={{ elements: { avatarBox: { width: 32, height: 32 } } }} />
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal">
          <button style={{
            backgroundColor: '#fff',
            color: '#000',
            border: '2px solid #000',
            padding: '0.4rem 1rem',
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}>Sign In</button>
        </SignInButton>
      </SignedOut>
    </div>
  );
}

function RootComponent() {
  return (
    <>
      <AuthHeader />
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </>
  );
}
