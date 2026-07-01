import { useState } from "react";
import { Sparkles, Calendar, Send, Loader2, RefreshCw, Building2, CheckCircle2, ArrowRight, Zap, Clock, MessageSquare } from "lucide-react";

const VOICE_PRESETS = [
  { id: "warm", label: "Warm & Personal" },
  { id: "bold", label: "Bold & Confident" },
  { id: "playful", label: "Playful & Fun" },
  { id: "pro", label: "Polished & Professional" },
];

export default function MarloSite() {
  const [view, setView] = useState("landing"); // landing | app
  const [step, setStep] = useState("setup"); // setup | generating | calendar
  const [biz, setBiz] = useState({ name: "", type: "", details: "", voice: "warm" });
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState("");
  const [postedIds, setPostedIds] = useState(new Set());
  const [connected, setConnected] = useState(false);

  function connectMeta() {
    // Replace YOUR_APP_ID with the App ID from developers.facebook.com once your app is set up.
    // Replace REDIRECT_URI with your deployed /api/meta-callback URL.
    const APP_ID = "YOUR_APP_ID";
    const REDIRECT_URI = encodeURIComponent("https://yourapp.vercel.app/api/meta-callback");
    const SCOPES = "pages_manage_posts,instagram_content_publish,pages_show_list";
    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${APP_ID}&redirect_uri=${REDIRECT_URI}&scope=${SCOPES}`;
    window.location.href = authUrl;
  }

  async function publishToMeta(post) {
    // This calls our backend, which actually posts using the connected account's token.
    // accessToken/targetId would come from what was stored after connectMeta() succeeded.
    try {
      const res = await fetch("/api/publish-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: post.platform.toLowerCase(),
          accessToken: "STORED_ACCESS_TOKEN",
          targetId: "STORED_PAGE_OR_IG_ID",
          caption: post.caption,
          imageUrl: post.imageUrl || null,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return true;
    } catch (e) {
      console.error("Publish failed:", e);
      return false;
    }
  }

  async function generateCalendar() {
    if (!biz.name.trim() || !biz.type.trim()) {
      setError("Tell me the business name and what they do first.");
      return;
    }
    setError("");
    setStep("generating");
    const voiceLabel = VOICE_PRESETS.find((v) => v.id === biz.voice)?.label || "Warm & Personal";
    const prompt = `You are an autonomous marketing agent for a small business. Generate a 7-day social media content calendar.

Business name: ${biz.name}
Business type: ${biz.type}
Extra details / promos / context: ${biz.details || "none provided"}
Brand voice: ${voiceLabel}

Return ONLY a JSON array of exactly 7 objects, one per day (Monday through Sunday), nothing else, no markdown fences. Each object must have:
- "day": the weekday name (e.g. "Monday")
- "platform": one of "Instagram", "Facebook"
- "caption": a ready-to-post caption in the brand voice, 2-4 sentences, include relevant hashtags at the end
- "postTime": a suggested time like "9:00 AM"
- "rationale": one short sentence explaining why this post works for this day`;
    try {
      const callApi = async () => {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        const text = await response.text();
        if (!text) throw new Error("Empty response from server (network hiccup)");
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error("Could not parse server response");
        }
        if (data.error) throw new Error(data.error.message || "API error");
        if (!data.content || !Array.isArray(data.content)) {
          throw new Error("No content in response");
        }
        return data;
      };

      let data;
      try {
        data = await callApi();
      } catch (firstErr) {
        // one automatic retry on network-type failures
        await new Promise((r) => setTimeout(r, 800));
        data = await callApi();
      }

      const raw = data.content.map((b) => b.text || "").join("");
      let clean = raw.replace(/```json|```/g, "").trim();
      const firstBracket = clean.indexOf("[");
      const lastBracket = clean.lastIndexOf("]");
      if (firstBracket !== -1 && lastBracket !== -1) {
        clean = clean.slice(firstBracket, lastBracket + 1);
      }
      const parsed = JSON.parse(clean);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("Empty or invalid response");
      }
      setPosts(parsed.map((p, i) => ({ ...p, id: i })));
      setStep("calendar");
    } catch (e) {
      console.error("Marlo generation error:", e);
      setError("Error: " + (e.message || "unknown") + " — screenshot this and send it back.");
      setStep("setup");
    }
  }

  async function markPosted(id) {
    const post = posts.find((p) => p.id === id);
    if (connected && post) {
      const success = await publishToMeta(post);
      if (!success) {
        setError("Couldn't publish that post live — it's been queued instead.");
      }
    }
    setPostedIds((prev) => new Set(prev).add(id));
  }

  function startApp() {
    setView("app");
    setStep("setup");
  }

  return (
    <div style={styles.page}>
      <div style={styles.bgGlow} />

      <header style={styles.header}>
        <div style={styles.logoRow} onClick={() => setView("landing")} role="button" tabIndex={0}>
          <div style={styles.logoMark}>
            <Sparkles size={18} color="#0B0E14" strokeWidth={2.5} />
          </div>
          <span style={styles.logoText}>MARLO</span>
        </div>
        {view === "landing" ? (
          <button style={styles.navBtn} onClick={startApp}>Try it free</button>
        ) : (
          <button style={styles.navBtn} onClick={() => setView("landing")}>Back to site</button>
        )}
      </header>

      {view === "landing" && (
        <main style={styles.landingMain}>
          <section style={styles.hero}>
            <span style={styles.eyebrow}>your marketing, hired out</span>
            <h1 style={styles.heroTitle}>
              The marketing employee<br />you never had to hire.
            </h1>
            <p style={styles.heroSub}>
              Marlo learns your business's voice and writes a full week of social content
              automatically — no agency, no $4k retainer, no staring at a blank caption box.
            </p>
            <button style={styles.heroBtn} onClick={startApp}>
              Generate your first week free <ArrowRight size={16} />
            </button>
            <p style={styles.heroNote}>No card needed. Takes about 60 seconds.</p>
          </section>

          <section style={styles.featureGrid}>
            <div style={styles.featureCard}>
              <Zap size={20} color="#D9FF3E" />
              <h3 style={styles.featureTitle}>Sounds like you, not a robot</h3>
              <p style={styles.featureText}>Tell Marlo your voice once. It writes every caption to match — warm, bold, playful, or polished.</p>
            </div>
            <div style={styles.featureCard}>
              <Clock size={20} color="#D9FF3E" />
              <h3 style={styles.featureTitle}>A full week, in one go</h3>
              <p style={styles.featureText}>Seven days of posts, platforms, and posting times planned out — done before your coffee's cold.</p>
            </div>
            <div style={styles.featureCard}>
              <MessageSquare size={20} color="#D9FF3E" />
              <h3 style={styles.featureTitle}>You stay in control</h3>
              <p style={styles.featureText}>Review every post before it goes out. Queue what you like, regenerate what you don't.</p>
            </div>
          </section>

          <section style={styles.ctaBand}>
            <h2 style={styles.ctaTitle}>Stop dreading your content calendar.</h2>
            <button style={styles.heroBtn} onClick={startApp}>
              Try Marlo now <ArrowRight size={16} />
            </button>
          </section>
        </main>
      )}

      {view === "app" && (
        <main style={styles.appMain}>
          {step === "setup" && (
            <div style={styles.setupCard}>
              <h1 style={styles.h1}>Give Marlo the brief.</h1>
              <p style={styles.subtext}>
                Tell it about the business once. It writes and queues a full week of content in the brand's own voice.
              </p>

              <div style={styles.field}>
                <label style={styles.label}>Business name</label>
                <input
                  style={styles.input}
                  placeholder="e.g. Sundial Coffee Co."
                  value={biz.name}
                  onChange={(e) => setBiz({ ...biz, name: e.target.value })}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>What do they do?</label>
                <input
                  style={styles.input}
                  placeholder="e.g. Independent coffee shop, espresso & pastries"
                  value={biz.type}
                  onChange={(e) => setBiz({ ...biz, type: e.target.value })}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Anything specific? (promos, events, vibe)</label>
                <textarea
                  style={{ ...styles.input, minHeight: 80, resize: "vertical" }}
                  placeholder="e.g. New oat milk latte launching Friday, locally roasted beans, cozy neighborhood spot"
                  value={biz.details}
                  onChange={(e) => setBiz({ ...biz, details: e.target.value })}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Brand voice</label>
                <div style={styles.voiceRow}>
                  {VOICE_PRESETS.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setBiz({ ...biz, voice: v.id })}
                      style={{ ...styles.voiceChip, ...(biz.voice === v.id ? styles.voiceChipActive : {}) }}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p style={styles.errorText}>{error}</p>}

              <button style={styles.primaryBtn} onClick={generateCalendar}>
                <Sparkles size={16} />
                Generate this week's content
              </button>
            </div>
          )}

          {step === "generating" && (
            <div style={styles.loadingWrap}>
              <Loader2 size={28} style={{ animation: "spin 1s linear infinite" }} color="#D9FF3E" />
              <p style={styles.loadingText}>Marlo is studying {biz.name || "the business"}'s voice and drafting the week...</p>
            </div>
          )}

          {step === "calendar" && (
            <div style={styles.calendarWrap}>
              <div style={styles.calendarHeader}>
                <div>
                  <div style={styles.bizRow}>
                    <Building2 size={16} color="#8A8F9C" />
                    <span style={styles.bizName}>{biz.name}</span>
                  </div>
                  <h2 style={styles.h2}>This week's queue</h2>
                </div>
                <button style={styles.secondaryBtn} onClick={() => setStep("setup")}>
                  <RefreshCw size={14} />
                  New brief
                </button>
              </div>

              {!connected && (
                <div style={styles.connectBanner}>
                  <span>Connect Instagram & Facebook to post for real instead of just queueing.</span>
                  <button style={styles.connectBtn} onClick={connectMeta}>Connect account</button>
                </div>
              )}
              {connected && (
                <div style={styles.connectedBanner}>
                  <CheckCircle2 size={14} color="#D9FF3E" />
                  <span>Instagram & Facebook connected — "Queue" will post live.</span>
                </div>
              )}

              <div style={styles.postList}>
                {posts.map((post) => {
                  const posted = postedIds.has(post.id);
                  return (
                    <div key={post.id} style={{ ...styles.postCard, ...(posted ? styles.postCardDone : {}) }}>
                      <div style={styles.postCardLeft}>
                        <div style={styles.dayBadge}>{post.day?.slice(0, 3).toUpperCase()}</div>
                      </div>
                      <div style={styles.postCardBody}>
                        <div style={styles.postMeta}>
                          <span style={styles.platformTag}>{post.platform}</span>
                          <span style={styles.timeTag}><Calendar size={12} style={{ marginRight: 4 }} />{post.postTime}</span>
                        </div>
                        <p style={styles.caption}>{post.caption}</p>
                        <p style={styles.rationale}>{post.rationale}</p>
                      </div>
                      <div style={styles.postCardRight}>
                        {posted ? (
                          <div style={styles.postedTag}><CheckCircle2 size={15} color="#D9FF3E" />Queued</div>
                        ) : (
                          <button style={styles.postBtn} onClick={() => markPosted(post.id)}><Send size={13} />Queue</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p style={styles.footnote}>
                "Queue" simulates scheduling here. Live posting requires connecting each platform's official API.
              </p>
            </div>
          )}
        </main>
      )}

      <footer style={styles.footer}>Marlo — built to handle the marketing you don't have time for.</footer>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#0B0E14", color: "#F4F4F2", fontFamily: "'Inter', -apple-system, sans-serif", position: "relative", overflow: "hidden" },
  bgGlow: { position: "absolute", top: -200, right: -200, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(217,255,62,0.12) 0%, rgba(217,255,62,0) 70%)", pointerEvents: "none" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "26px 32px", position: "relative", zIndex: 2 },
  logoRow: { display: "flex", alignItems: "center", gap: 10, cursor: "pointer" },
  logoMark: { width: 30, height: 30, borderRadius: 8, background: "#D9FF3E", display: "flex", alignItems: "center", justifyContent: "center" },
  logoText: { fontWeight: 800, fontSize: 17, letterSpacing: "0.06em" },
  navBtn: { background: "#D9FF3E", color: "#0B0E14", border: "none", borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" },

  landingMain: { position: "relative", zIndex: 2, maxWidth: 900, margin: "0 auto", padding: "40px 24px 0" },
  hero: { textAlign: "center", padding: "40px 0 60px" },
  eyebrow: { fontSize: 12.5, color: "#D9FF3E", letterSpacing: "0.1em", fontWeight: 700, textTransform: "uppercase" },
  heroTitle: { fontSize: 44, fontWeight: 800, lineHeight: 1.12, margin: "16px 0 18px", letterSpacing: "-0.02em" },
  heroSub: { fontSize: 16, color: "#A6ABB6", maxWidth: 520, margin: "0 auto 28px", lineHeight: 1.6 },
  heroBtn: { background: "#D9FF3E", color: "#0B0E14", border: "none", borderRadius: 10, padding: "14px 24px", fontSize: 14.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 },
  heroNote: { fontSize: 12.5, color: "#6B7080", marginTop: 12 },

  featureGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 60 },
  featureCard: { background: "#12151D", border: "1px solid #1E222C", borderRadius: 14, padding: "22px 20px" },
  featureTitle: { fontSize: 15, fontWeight: 700, margin: "12px 0 6px" },
  featureText: { fontSize: 13, color: "#8A8F9C", lineHeight: 1.55, margin: 0 },

  ctaBand: { textAlign: "center", padding: "50px 0 70px", borderTop: "1px solid #1E222C" },
  ctaTitle: { fontSize: 24, fontWeight: 800, marginBottom: 20 },

  appMain: { position: "relative", zIndex: 2, maxWidth: 640, margin: "0 auto", padding: "20px 24px 60px" },
  setupCard: { background: "#12151D", border: "1px solid #1E222C", borderRadius: 18, padding: "36px 32px" },
  h1: { fontSize: 28, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.02em" },
  subtext: { color: "#8A8F9C", fontSize: 14.5, lineHeight: 1.5, margin: "0 0 28px" },
  field: { marginBottom: 18 },
  label: { display: "block", fontSize: 12.5, color: "#8A8F9C", marginBottom: 7, fontWeight: 600, letterSpacing: "0.02em" },
  input: { width: "100%", background: "#0B0E14", border: "1px solid #262B36", borderRadius: 10, padding: "12px 14px", color: "#F4F4F2", fontSize: 14.5, fontFamily: "inherit", outline: "none", boxSizing: "border-box" },
  voiceRow: { display: "flex", flexWrap: "wrap", gap: 8 },
  voiceChip: { background: "#0B0E14", border: "1px solid #262B36", borderRadius: 999, padding: "8px 14px", fontSize: 13, color: "#C5C8D1", cursor: "pointer" },
  voiceChipActive: { background: "#D9FF3E", color: "#0B0E14", borderColor: "#D9FF3E", fontWeight: 700 },
  primaryBtn: { width: "100%", background: "#D9FF3E", color: "#0B0E14", border: "none", borderRadius: 10, padding: "14px 18px", fontSize: 14.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 },
  errorText: { color: "#FF8A65", fontSize: 13, marginBottom: 12 },
  loadingWrap: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 20px", textAlign: "center", gap: 18 },
  loadingText: { color: "#8A8F9C", fontSize: 14.5, maxWidth: 320 },
  calendarWrap: { paddingBottom: 20 },
  calendarHeader: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22 },
  bizRow: { display: "flex", alignItems: "center", gap: 6, marginBottom: 6 },
  bizName: { fontSize: 13, color: "#8A8F9C" },
  h2: { fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.01em" },
  secondaryBtn: { background: "transparent", border: "1px solid #262B36", borderRadius: 9, padding: "8px 13px", color: "#C5C8D1", fontSize: 12.5, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" },
  postList: { display: "flex", flexDirection: "column", gap: 10 },
  postCard: { display: "flex", gap: 14, background: "#12151D", border: "1px solid #1E222C", borderRadius: 14, padding: "16px 16px", alignItems: "flex-start" },
  postCardDone: { borderColor: "#3A4326" },
  postCardLeft: { flexShrink: 0 },
  dayBadge: { width: 42, height: 42, borderRadius: 10, background: "#1A1E27", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 800, color: "#D9FF3E", letterSpacing: "0.02em" },
  postCardBody: { flex: 1, minWidth: 0 },
  postMeta: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 },
  platformTag: { fontSize: 11.5, fontWeight: 700, color: "#0B0E14", background: "#C5C8D1", padding: "3px 9px", borderRadius: 999 },
  timeTag: { fontSize: 12, color: "#8A8F9C", display: "flex", alignItems: "center" },
  caption: { fontSize: 14, lineHeight: 1.55, margin: "0 0 8px", color: "#EDEEF0" },
  rationale: { fontSize: 12, color: "#6B7080", margin: 0, fontStyle: "italic" },
  postCardRight: { flexShrink: 0, paddingTop: 2 },
  postBtn: { background: "#1A1E27", border: "1px solid #262B36", color: "#F4F4F2", borderRadius: 9, padding: "8px 12px", fontSize: 12.5, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontWeight: 600 },
  postedTag: { display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#D9FF3E", fontWeight: 600 },
  footnote: { fontSize: 12, color: "#6B7080", lineHeight: 1.6, marginTop: 24, padding: "14px 16px", background: "#12151D", border: "1px solid #1E222C", borderRadius: 12 },
  connectBanner: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "#1A1E27", border: "1px solid #262B36", borderRadius: 12, padding: "12px 16px", marginBottom: 18, fontSize: 13, color: "#C5C8D1" },
  connectBtn: { background: "#D9FF3E", color: "#0B0E14", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  connectedBanner: { display: "flex", alignItems: "center", gap: 8, background: "#12181A", border: "1px solid #2A3A26", borderRadius: 12, padding: "10px 16px", marginBottom: 18, fontSize: 13, color: "#A8C99A" },
  footer: { textAlign: "center", fontSize: 12, color: "#4A4F5C", padding: "20px 0 30px", position: "relative", zIndex: 2 },
};
