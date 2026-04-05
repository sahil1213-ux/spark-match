import { useEffect, useState } from "react";
import { Download, Share, MoreVertical, Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) setPlatform("ios");
    else if (/Android/.test(ua)) setPlatform("android");
    else setPlatform("desktop");

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-foreground">EliteSync is installed!</h1>
        <p className="mt-2 text-muted-foreground">Open it from your home screen for the best experience.</p>
        <Button className="mt-6" onClick={() => navigate("/")}>Go to App</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 flex items-center gap-3 bg-background/80 backdrop-blur-sm px-4 py-3 border-b border-border">
        <button onClick={() => navigate(-1)} className="text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Install EliteSync</h1>
      </div>

      <div className="max-w-md mx-auto px-6 py-8 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <img src="/icon-192.png" alt="EliteSync" className="w-20 h-20 mx-auto rounded-2xl shadow-lg" />
          <h2 className="text-xl font-bold text-foreground">Get the full app experience</h2>
          <p className="text-sm text-muted-foreground">Install EliteSync on your device — no app store needed. It launches full-screen and feels like a native app.</p>
        </div>

        {/* Install button (Chrome/Edge/Android) */}
        {deferredPrompt && (
          <Button onClick={handleInstall} className="w-full gap-2" size="lg">
            <Download className="h-5 w-5" />
            Install EliteSync
          </Button>
        )}

        {/* iOS instructions */}
        {platform === "ios" && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Install on iPhone / iPad</h3>
            <ol className="space-y-4 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                <span>Tap the <Share className="inline h-4 w-4 text-foreground" /> <strong className="text-foreground">Share</strong> button in Safari's toolbar.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                <span>Scroll down and tap <Plus className="inline h-4 w-4 text-foreground" /> <strong className="text-foreground">Add to Home Screen</strong>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
                <span>Tap <strong className="text-foreground">Add</strong> — EliteSync will appear on your home screen.</span>
              </li>
            </ol>
          </div>
        )}

        {/* Android instructions (fallback if no prompt) */}
        {platform === "android" && !deferredPrompt && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Install on Android</h3>
            <ol className="space-y-4 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                <span>Tap the <MoreVertical className="inline h-4 w-4 text-foreground" /> <strong className="text-foreground">menu</strong> (three dots) in Chrome.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                <span>Tap <strong className="text-foreground">Install app</strong> or <strong className="text-foreground">Add to Home Screen</strong>.</span>
              </li>
            </ol>
          </div>
        )}

        {/* Desktop instructions */}
        {platform === "desktop" && !deferredPrompt && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Install on Desktop</h3>
            <p className="text-sm text-muted-foreground">
              In Chrome or Edge, click the install icon <Download className="inline h-4 w-4 text-foreground" /> in the address bar, or open the browser menu and select <strong className="text-foreground">Install EliteSync</strong>.
            </p>
            <p className="text-xs text-muted-foreground">For the best experience, open this page on your phone.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Install;
