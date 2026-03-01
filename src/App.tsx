import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Questionnaire from "./pages/Questionnaire";
import PhotoUpload from "./pages/PhotoUpload";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import ChatList from "./pages/ChatList";
import Chat from "./pages/Chat";
import Filters from "./pages/Filters";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "./components/RouteGuards";
import { firebaseConfigError } from "./lib/firebase";

const queryClient = new QueryClient();

const MissingFirebaseConfig = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
    <div className="max-w-2xl rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-xl">
      <h1 className="text-xl font-semibold">Firebase configuration is missing</h1>
      <p className="mt-3 text-sm text-slate-300">The app cannot initialize authentication because required Vite environment variables are not set.</p>
      <p className="mt-3 text-xs text-red-300">{firebaseConfigError}</p>
      <pre className="mt-4 overflow-x-auto rounded bg-slate-950 p-3 text-xs text-slate-200">{`Create .env in project root with:
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...`}</pre>
      <p className="mt-3 text-xs text-slate-400">After saving .env, stop and restart npm run dev.</p>
    </div>
  </div>
);

const App = () => {
  if (firebaseConfigError) {
    return <MissingFirebaseConfig />;
  }

  return (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            <Route path="/signup" element={<PublicOnlyRoute><Signup /></PublicOnlyRoute>} />
            <Route path="/questionnaire" element={<ProtectedRoute><Questionnaire /></ProtectedRoute>} />
            <Route path="/photos" element={<ProtectedRoute><PhotoUpload /></ProtectedRoute>} />
            <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/chats" element={<ProtectedRoute><ChatList /></ProtectedRoute>} />
            <Route path="/chat/:userId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/filters" element={<ProtectedRoute><Filters /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
};

export default App;
