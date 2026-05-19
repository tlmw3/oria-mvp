"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { SavingsJar } from "@/components/SavingsJar";

/* ─── SVG Icons ─── */
const JarIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3h12v2a6 6 0 01-6 6 6 6 0 01-6-6V3z" />
    <path d="M6 11c0 3.314 2.686 6 6 6s6-2.686 6-6v5a2 2 0 01-2 2H8a2 2 0 01-2-2v-5z" />
  </svg>
);
const ZapIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const UsersIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const LockIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);
const ActivityIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);
const TrophyIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4a2 2 0 000 4c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4a2 2 0 000-4h-2" />
    <path d="M6 3h12v6a6 6 0 01-12 0V3z" />
    <line x1="12" y1="17" x2="12" y2="21" />
    <line x1="9" y1="21" x2="15" y2="21" />
  </svg>
);

/* ─── Scroll-reveal wrapper ─── */
function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) { setVisible(true); return; }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

/* ─── APY Bar (animated) ─── */
function ApyBar({ streak, apy, delay = 0 }: { streak: number; apy: number; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) { setVis(true); return; }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const maxH = 130;
  const h = (apy / 8.5) * maxH;
  return (
    <div ref={ref} className="flex flex-col items-center gap-2.5">
      <span className="text-sm font-bold text-purple-300 tabular-nums">{apy.toFixed(1)}%</span>
      <div
        className="w-10 rounded-md relative overflow-hidden"
        style={{ height: maxH, background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)" }}
      >
        <div
          className="absolute bottom-0 left-0 right-0 rounded-md transition-all duration-1000 ease-out"
          style={{
            height: vis ? h : 0,
            background: `linear-gradient(to top, #7c3aed, ${apy >= 7 ? "#a78bfa" : "#c4b5fd"})`,
            transitionDelay: `${delay}ms`,
            boxShadow: vis ? "0 0 12px rgba(124,58,237,0.4)" : "none",
          }}
        />
      </div>
      <span className="text-xs font-semibold text-purple-400">{streak}w</span>
    </div>
  );
}

/* ─── Feature Card ─── */
function FeatureCard({
  icon,
  title,
  desc,
  delay = 0,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  delay?: number;
}) {
  return (
    <Reveal delay={delay}>
      <div
        className="rounded-2xl p-7 cursor-default group transition-all duration-300 hover:-translate-y-1"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(167,139,250,0.15)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(167,139,250,0.35)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.07)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(167,139,250,0.15)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)"; }}
      >
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 text-purple-300"
          style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.3)" }}
        >
          {icon}
        </div>
        <h3 className="text-base font-bold text-white mb-2 tracking-tight">{title}</h3>
        <p className="text-sm leading-relaxed" style={{ color: "rgba(196,181,253,0.75)" }}>{desc}</p>
      </div>
    </Reveal>
  );
}

/* ─── Step ─── */
function Step({ number, title, desc, delay = 0 }: { number: string; title: string; desc: string; delay?: number }) {
  return (
    <Reveal delay={delay} className="flex gap-5 items-start">
      <div
        className="min-w-[44px] h-[44px] rounded-full flex items-center justify-center text-[17px] font-bold text-white flex-shrink-0"
        style={{ background: "linear-gradient(135deg, #7c3aed, #a78bfa)", boxShadow: "0 4px 20px rgba(124,58,237,0.4)" }}
      >
        {number}
      </div>
      <div>
        <h4 className="text-[17px] font-bold text-white mb-1.5 tracking-tight">{title}</h4>
        <p className="text-[15px] leading-relaxed" style={{ color: "rgba(196,181,253,0.75)" }}>{desc}</p>
      </div>
    </Reveal>
  );
}

/* ─── Section Header ─── */
function SectionHead({ label, title, highlight, desc }: { label: string; title: string; highlight: string; desc?: string }) {
  return (
    <div className="text-center mb-14">
      <span
        className="text-[11px] font-semibold tracking-[0.12em] uppercase px-3 py-1 rounded-full"
        style={{ color: "#c4b5fd", background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.3)" }}
      >
        {label}
      </span>
      <h2 className="font-extrabold mt-5 text-white tracking-tight leading-tight text-[clamp(28px,4vw,42px)]">
        {title}{" "}
        <span style={{ background: "linear-gradient(90deg, #a78bfa, #c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          {highlight}
        </span>
      </h2>
      {desc && (
        <p className="text-base mt-4 max-w-[460px] mx-auto leading-relaxed" style={{ color: "rgba(196,181,253,0.7)" }}>
          {desc}
        </p>
      )}
    </div>
  );
}

/* ─── Week Pill (for hero viz) ─── */
function WeekPill({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
        style={
          active
            ? { background: "linear-gradient(135deg, #7c3aed, #a78bfa)", color: "white", boxShadow: "0 0 12px rgba(124,58,237,0.5)" }
            : { background: "rgba(167,139,250,0.12)", color: "rgba(167,139,250,0.5)", border: "1px solid rgba(167,139,250,0.2)" }
        }
      >
        {active ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : null}
      </div>
      <span className="text-[9px] font-medium" style={{ color: active ? "#c4b5fd" : "rgba(167,139,250,0.35)" }}>{label}</span>
    </div>
  );
}

/* ─── Main Landing ─── */
export default function LandingPage() {
  const [heroVis, setHeroVis] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const delay = mq.matches ? 0 : 200;
    const t = setTimeout(() => setHeroVis(true), delay);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Illustrative APY curve for the pool model: a 3 % baseline that climbs
  // toward ~8 % as the streak component of the activity score maxes out at
  // 16 weeks. Numbers are representative, not a promise.
  const apyData = [
    { s: 0, a: 3.0 }, { s: 4, a: 4.5 }, { s: 8, a: 5.8 }, { s: 12, a: 7.0 }, { s: 16, a: 8.0 },
  ];

  const days = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div
      className="min-h-screen text-white relative"
      style={{ background: "linear-gradient(160deg, #0d0818 0%, #140d2e 50%, #0a0620 100%)" }}
    >
      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute -top-[15%] -right-[5%] w-[700px] h-[700px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(124,58,237,0.18) 0%, rgba(124,58,237,0.06) 40%, transparent 70%)", filter: "blur(60px)" }}
        />
        <div
          className="absolute top-[45%] -left-[10%] w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(167,139,250,0.1) 0%, transparent 70%)", filter: "blur(50px)" }}
        />
        <div
          className="absolute bottom-[10%] right-[15%] w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(196,181,253,0.08) 0%, transparent 65%)", filter: "blur(50px)" }}
        />
      </div>

      {/* NAV */}
      <nav
        className="fixed top-4 left-4 right-4 z-[100] px-6 py-3 rounded-2xl flex items-center justify-between transition-all duration-300"
        style={{
          background: scrolled ? "rgba(13,8,24,0.85)" : "rgba(20,13,46,0.6)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(167,139,250,0.15)",
          boxShadow: scrolled ? "0 4px 30px rgba(0,0,0,0.4)" : "none",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a78bfa)", boxShadow: "0 2px 10px rgba(124,58,237,0.4)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-[20px] font-extrabold text-white tracking-tight">Oria</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#features" className="hidden sm:inline text-sm font-medium transition-colors duration-200 cursor-pointer" style={{ color: "rgba(196,181,253,0.7)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#c4b5fd"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(196,181,253,0.7)"; }}>
            Features
          </a>
          <a href="#how-it-works" className="hidden sm:inline text-sm font-medium transition-colors duration-200 cursor-pointer" style={{ color: "rgba(196,181,253,0.7)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#c4b5fd"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(196,181,253,0.7)"; }}>
            How it works
          </a>
          <a href="#apy" className="hidden sm:inline text-sm font-medium transition-colors duration-200 cursor-pointer" style={{ color: "rgba(196,181,253,0.7)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#c4b5fd"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(196,181,253,0.7)"; }}>
            APY
          </a>
          <Link
            href="/onboarding"
            className="text-sm font-semibold px-5 py-2 rounded-xl text-white transition-all duration-200 cursor-pointer"
            style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)", boxShadow: "0 2px 16px rgba(124,58,237,0.35)" }}
          >
            Launch App
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-screen flex items-center justify-center pt-24 pb-12 relative z-[1]">
        <div className="max-w-[1080px] mx-auto px-6 flex items-center gap-16 flex-wrap justify-center">
          {/* Left text */}
          <div
            className={`flex-[1_1_400px] max-w-[520px] transition-all duration-[900ms] ease-out ${heroVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          >
            <div
              className="inline-flex items-center gap-2 px-3.5 py-[6px] rounded-full mb-7 text-[11px] font-semibold tracking-[0.1em]"
              style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.35)", color: "#c4b5fd" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              LIVE ON AVALANCHE TESTNET
            </div>

            <h1 className="font-extrabold leading-[1.07] tracking-tight text-white mb-6 text-[clamp(38px,5vw,58px)]">
              Save more.<br />
              <span style={{ background: "linear-gradient(90deg, #a78bfa 0%, #e879f9 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Move more.
              </span><br />
              Earn more.
            </h1>

            <p className="text-[17px] leading-[1.75] mb-9 max-w-[430px]" style={{ color: "rgba(196,181,253,0.8)" }}>
              The crypto savings jar that rewards your consistency. Hit your weekly fitness goals, grow your streak, and boost your yield above the{" "}
              <span className="font-semibold text-purple-300">3% baseline</span>. Challenge friends and save together.
            </p>

            <div className="flex gap-4 flex-wrap">
              <Link
                href="/onboarding"
                className="text-[15px] font-semibold px-8 py-3.5 rounded-xl text-white transition-all duration-200 cursor-pointer hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)", boxShadow: "0 6px 28px rgba(124,58,237,0.45)" }}
              >
                Start Saving
              </Link>
              <a
                href="#how-it-works"
                className="text-[15px] font-medium px-8 py-3.5 rounded-xl transition-all duration-200 cursor-pointer"
                style={{ border: "1px solid rgba(167,139,250,0.3)", color: "rgba(196,181,253,0.85)", background: "rgba(255,255,255,0.03)", backdropFilter: "blur(8px)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(167,139,250,0.6)"; (e.currentTarget as HTMLAnchorElement).style.color = "#c4b5fd"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(167,139,250,0.3)"; (e.currentTarget as HTMLAnchorElement).style.color = "rgba(196,181,253,0.85)"; }}
              >
                How it works ↓
              </a>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-3 mt-9">
              <div className="flex -space-x-2">
                {["#7c3aed", "#9333ea", "#a855f7", "#c026d3"].map((c, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: c, border: "2px solid #0d0818", zIndex: 4 - i }}
                  >
                    {["T", "A", "M", "S"][i]}
                  </div>
                ))}
              </div>
              <p className="text-[13px]" style={{ color: "rgba(196,181,253,0.6)" }}>
                <span className="font-semibold text-purple-300">47 users</span> already saving
              </p>
            </div>
          </div>

          {/* Right: Jar + stats card */}
          <div
            className={`flex-none flex flex-col items-center gap-5 transition-all duration-[1100ms] ease-out ${heroVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}
            style={{ transitionDelay: heroVis ? "300ms" : "0ms" }}
          >
            <SavingsJar fillPercent={72} streak={6} />

            {/* Week dots card */}
            <div
              className="rounded-2xl px-6 py-4 flex flex-col gap-3"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.18)", backdropFilter: "blur(16px)", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}
            >
              <p className="text-xs font-semibold text-center" style={{ color: "rgba(196,181,253,0.6)" }}>This week&apos;s progress</p>
              <div className="flex gap-2.5 justify-center">
                {days.map((d, i) => (
                  <WeekPill key={i} active={i < 5} label={d} />
                ))}
              </div>
              <div className="flex justify-between items-center pt-1 border-t" style={{ borderColor: "rgba(167,139,250,0.12)" }}>
                <span className="text-xs" style={{ color: "rgba(196,181,253,0.55)" }}>APY</span>
                <span className="text-sm font-bold text-purple-300">7.24%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="py-8 relative z-[1]" style={{ borderTop: "1px solid rgba(167,139,250,0.1)", borderBottom: "1px solid rgba(167,139,250,0.1)", background: "rgba(255,255,255,0.02)" }}>
        <div className="max-w-[1080px] mx-auto px-6 flex justify-around flex-wrap gap-5">
          {[
            { v: "€88B", l: "Addressable market" },
            { v: "4–8%", l: "Dynamic APY" },
            { v: "<2s", l: "Finality on Avalanche" },
            { v: "0%", l: "Smart contract risk*" },
          ].map((s, i) => (
            <div key={i} className="text-center min-w-[130px]">
              <div
                className="text-[26px] font-extrabold tabular-nums tracking-tight"
                style={{ background: "linear-gradient(90deg, #a78bfa, #c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              >
                {s.v}
              </div>
              <div className="text-[13px] mt-1" style={{ color: "rgba(196,181,253,0.55)" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-28 relative z-[1]">
        <div className="max-w-[1080px] mx-auto px-6">
          <Reveal>
            <SectionHead label="Features" title="Savings that" highlight="move with you" />
          </Reveal>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(270px,1fr))] gap-4">
            <FeatureCard icon={<JarIcon />} title="Programmable Jars" desc="Set a weekly running target. Your jar fills as you hit milestones. Visual progress that makes saving tangible and satisfying." delay={0} />
            <FeatureCard icon={<ZapIcon />} title="Streak-Boosted Yield" desc="A 3% baseline is guaranteed for everyone. Each consistent week grows your share of a redistribution pool — the most active runners take a bigger slice. Powered by Morpho lending." delay={100} />
            <FeatureCard icon={<UsersIcon />} title="Social Challenges" desc="Create group challenges with friends. Compete on leaderboards, share milestones, and unlock multiplier bonuses together." delay={200} />
            <FeatureCard icon={<LockIcon />} title="Non-Custodial" desc="Your keys, your funds. Built on Avalanche with Privy embedded wallets — no seed phrase needed, instant onboarding." delay={300} />
            <FeatureCard icon={<ActivityIcon />} title="Activity Tracking" desc="Connect Strava or Apple Health. We verify your workouts automatically and update your streak every week." delay={400} />
            <FeatureCard icon={<TrophyIcon />} title="Milestone Unlocks" desc="Hit 5 weeks? Unlock social sharing. 10 weeks? Earn max APY. Suggested progression paths keep you motivated." delay={500} />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-28 relative z-[1]">
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, transparent 0%, rgba(124,58,237,0.05) 50%, transparent 100%)", pointerEvents: "none" }}
        />
        <div className="max-w-[1080px] mx-auto px-6 relative">
          <Reveal>
            <SectionHead label="How it works" title="Three steps to" highlight="smarter saving" />
          </Reveal>
          <div className="flex flex-col gap-10 max-w-[520px] mx-auto">
            <Step number="1" title="Connect & Set Goals" desc="Sign in with email or wallet via Privy. Choose your activity and set a weekly km target. No seed phrase, no friction." delay={0} />
            <Step number="2" title="Deposit & Start Earning" desc="Fund your jar with USDC or AVAX. Hit 'Start Earning' and your funds begin generating yield through Morpho's lending protocol." delay={150} />
            <Step number="3" title="Stay Consistent, Earn More" desc="Meet your weekly goal to grow your streak. Each week feeds your activity score; 16 consecutive weeks max out the streak component and your share of the bonus pool." delay={300} />
          </div>
        </div>
      </section>

      {/* APY */}
      <section id="apy" className="py-28 relative z-[1]">
        <div className="max-w-[1080px] mx-auto px-6">
          <Reveal>
            <SectionHead
              label="Yield model"
              title="Your consistency,"
              highlight="rewarded"
              desc="A 3% baseline is guaranteed for everyone. Your activity score — fed by your streak — grows your share of the bonus pool, with the streak component fully unlocked at 16 weeks."
            />
          </Reveal>
          <Reveal delay={150}>
            <div
              className="flex justify-center items-end gap-8 px-10 py-10 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(167,139,250,0.18)", backdropFilter: "blur(20px)", boxShadow: "0 8px 40px rgba(0,0,0,0.3)" }}
            >
              {apyData.map((d, i) => (
                <ApyBar key={d.s} streak={d.s} apy={d.a} delay={i * 160 + 200} />
              ))}
            </div>
          </Reveal>
          <div className="text-center mt-5 text-xs" style={{ color: "rgba(196,181,253,0.4)" }}>
            Illustrative pool-based APY by streak length — powered by Morpho lending
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pt-16 pb-28 relative z-[1]">
        <div className="max-w-[1080px] mx-auto px-6">
          <Reveal>
            <div
              className="rounded-[28px] px-10 py-16 text-center relative overflow-hidden"
              style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(167,139,250,0.25)", backdropFilter: "blur(20px)" }}
            >
              <div
                className="absolute -top-[50%] left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)", filter: "blur(40px)" }}
              />
              <h2 className="font-extrabold tracking-tight leading-[1.1] text-white mb-4 relative text-[clamp(28px,4.5vw,46px)]">
                Ready to launch{" "}
                <span style={{ background: "linear-gradient(90deg, #a78bfa, #e879f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  your goals?
                </span>
              </h2>
              <p className="text-[17px] mb-10 relative" style={{ color: "rgba(196,181,253,0.75)" }}>
                Try the demo and see how Oria rewards consistency.
              </p>
              <div className="flex gap-4 justify-center flex-wrap relative">
                <Link
                  href="/onboarding"
                  className="text-[15px] font-semibold px-9 py-3.5 rounded-xl text-white transition-all duration-200 cursor-pointer hover:-translate-y-0.5"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)", boxShadow: "0 6px 28px rgba(124,58,237,0.5)" }}
                >
                  Try the Demo →
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 relative z-[1]" style={{ borderTop: "1px solid rgba(167,139,250,0.1)" }}>
        <div className="max-w-[1080px] mx-auto px-6 flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-lg font-extrabold tracking-tight" style={{ color: "#a78bfa" }}>Oria</span>
            <span
              className="text-[10px] font-semibold px-2 py-[3px] rounded"
              style={{ color: "#a78bfa", border: "1px solid rgba(167,139,250,0.3)" }}
            >
              MVP
            </span>
          </div>
          <div className="text-xs" style={{ color: "rgba(196,181,253,0.4)" }}>
            Built on Avalanche · Yield by Morpho · *MVP uses simulated yield
          </div>
        </div>
      </footer>
    </div>
  );
}
