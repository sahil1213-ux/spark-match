## Convert EliteSync to a PWA (Installable Web App)

Since you don't need offline support, we'll use the **simple manifest approach** — no service workers or `vite-plugin-pwa` needed. Users can install the app to their home screen directly from the browser.

### What We'll Do

1. **Create `public/manifest.json**` with app name, theme color, icons, and `display: "standalone"` so it looks and feels like a native app when installed.
2. **Generate PWA icons** — Create multiple icon sizes (192x192, 512x512) in `public/` using a simple SVG-based icon with the EliteSync branding.
3. **Update `index.html**` — Add the manifest link, theme-color meta tag, apple-touch-icon, and mobile web app meta tags for iOS/Android support.
4. **Create an `/install` page** — A simple page with instructions for installing the app on iOS (Share → Add to Home Screen) and Android (browser menu → Install), with a programmatic install prompt button for supported browsers.
5. **Add the `/install` route** to the app router.

### Technical Details

- `display: "standalone"` makes the app run full-screen without browser chrome
- `theme-color` sets the status bar color on Android
- `apple-mobile-web-app-capable` enables standalone mode on iOS Safari
- The install prompt uses the `beforeinstallprompt` browser event (Chrome/Edge/Android)
- No service workers = no caching issues in the Lovable preview

### Result

Users visiting your app on mobile can install it to their home screen. It will launch full-screen, have its own app icon, and feel like a native app — no app store required.

&nbsp;

Note: remember no user must be asked to login in lovable also ok they just directly navigated to the login page ok.