// src/components/SplashLoader.jsx
import logo from "../assets/ShareZone-Logo1.png";

export default function SplashLoader() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-sz-bg">
      <div className="relative">
        {/* Logo in the middle */}
        <div className="h-24 w-24 rounded-full bg-slate-950/90 flex items-center justify-center border border-sz-border shadow-sz-soft">
          <img
            src={logo}
            alt="ShareZone"
            className="h-14 w-14 rounded-full object-cover"
          />
        </div>

        {/* Spinning ring around the logo */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-28 w-28 rounded-full border-t-2 border-sz-accent/80 border-b-2 border-slate-700/80 animate-spin" />
        </div>
      </div>

      <p className="mt-5 text-xs sm:text-sm text-slate-400 tracking-[0.18em] uppercase">
        Waking up your ShareZone…
      </p>
      <p className="mt-1 text-[10px] text-slate-500">
        (If this takes a bit, Render free tier is starting your server.)
      </p>
    </div>
  );
}
