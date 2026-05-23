import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from 'react-oidc-context';
import type { User } from 'oidc-client-ts';

const cognitoAuthConfig = {
  authority: import.meta.env.VITE_OAUTH_AUTHORITY,
  client_id: import.meta.env.VITE_OAUTH_CLIENT_ID,
  redirect_uri: `${window.location.origin}/oidc_callback`,
  response_type: "code",
  scope: "openid",
  onSigninCallback: (_user :  User | undefined) => {
    // Remove authentication payload from URL
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );
    
    // Redirect to main page
    window.location.href = "/"; 
  }
};

// wrap the application with AuthProvider
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider {...cognitoAuthConfig}>
      <App />
    </AuthProvider>
  </StrictMode>,
)