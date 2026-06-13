import React from "react";

interface EventBannerPlaceholderProps {
  category: string;
  title: string;
  size?: "card" | "detail";
}

export default function EventBannerPlaceholder({ category, title, size = "card" }: EventBannerPlaceholderProps) {
  // Select premium mesh/angular gradients based on the category
  const getGradient = () => {
    switch (category?.toLowerCase()) {
      case "tech":
        return "from-slate-900 via-cyan-950 to-blue-950 text-cyan-400";
      case "music":
        return "from-slate-900 via-rose-950 to-purple-950 text-rose-400";
      case "business":
        return "from-slate-900 via-teal-950 to-emerald-950 text-emerald-400";
      case "sports":
        return "from-slate-900 via-orange-950 to-amber-950 text-orange-400";
      case "design":
        return "from-slate-900 via-fuchsia-950 to-violet-950 text-fuchsia-400";
      case "food":
        return "from-slate-900 via-orange-950 to-red-950 text-orange-400";
      case "literature":
        return "from-slate-900 via-stone-900 to-rose-950 text-rose-400";
      case "arts":
        return "from-slate-900 via-yellow-950 to-amber-950 text-yellow-400";
      case "education":
        return "from-slate-900 via-indigo-950 to-blue-950 text-indigo-400";
      case "gaming":
        return "from-slate-900 via-purple-950 to-fuchsia-950 text-fuchsia-400";
      default:
        return "from-zinc-900 via-zinc-800 to-black text-zinc-400";
    }
  };

  const gradientClass = getGradient();

  return (
    <div className={`w-full h-full bg-gradient-to-br ${gradientClass.split(" ")[0] + " " + gradientClass.split(" ")[1] + " " + gradientClass.split(" ")[2]} relative overflow-hidden flex flex-col justify-between p-6 md:p-8 border-b border-zinc-800/40 select-none`}>
      {/* Mesh Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:16px_16px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />
      
      {/* Decorative Orbs */}
      <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute left-6 top-6 w-48 h-48 rounded-full bg-white/5 blur-2xl" />

      {/* Large Backdrop Glyphs */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
        <span className="text-[120px] font-black tracking-widest uppercase font-mono">
          {category?.substring(0, 2) || "EV"}
        </span>
      </div>

      {/* Floating Spark */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-32 h-32 bg-current/10 rounded-full blur-2xl animate-pulse" />

      {/* Header Info */}
      <div className="relative z-10 flex justify-between items-start w-full">
        <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-[0.25em] text-white/50 uppercase bg-white/5 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 shadow-sm">
          {category || "EXPERIENCE"}
        </span>
        <span className="text-[9px] font-mono text-white/30 tracking-widest uppercase">
          ✦ Premium Event
        </span>
      </div>

      {/* Footer Info */}
      <div className="relative z-10 w-full mt-auto">
        <h4 className={`font-sans font-bold tracking-tight text-white line-clamp-2 ${size === "detail" ? "text-2xl md:text-3xl" : "text-lg md:text-xl"}`}>
          {title}
        </h4>
        <div className="flex items-center gap-1.5 mt-2 opacity-50">
          <div className="w-1.5 h-1.5 rounded-full bg-current" />
          <span className="text-[10px] font-mono tracking-widest text-white/70 uppercase">
            Eventra Experience
          </span>
        </div>
      </div>
    </div>
  );
}
