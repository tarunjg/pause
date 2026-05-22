import { useState } from "react";

const INTERESTS = [
  { id: "org", label: "🏢 Bring Pause to My Org" },
  { id: "ambassador", label: "🤝 Become a Pause Ambassador" },
  { id: "whatsapp", label: "💬 Join the Pause WhatsApp Group" },
];

function ConnectForm() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    org: "",
    interests: [],
    notes: "",
  });
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const toggleInterest = (id) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(id)
        ? prev.interests.filter((i) => i !== id)
        : [...prev.interests, id],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Something went wrong");
      }

      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error.message || "Failed to submit. Please try again.");
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (status === "success") {
    return (
      <div className="newsletter-success">
        <div className="success-icon">✓</div>
        <p className="success-message">Thanks for reaching out!</p>
        <p className="newsletter__note">We'll be in touch soon.</p>
      </div>
    );
  }

  return (
    <form className="connect-form" onSubmit={handleSubmit}>
      <div className="connect-form__fields">
        <input
          type="text"
          name="firstName"
          placeholder="First name"
          value={formData.firstName}
          onChange={handleChange}
          required
          className="form-input"
          disabled={status === "loading"}
        />
        <input
          type="text"
          name="lastName"
          placeholder="Last name"
          value={formData.lastName}
          onChange={handleChange}
          required
          className="form-input"
          disabled={status === "loading"}
        />
      </div>
      <input
        type="email"
        name="email"
        placeholder="Email address"
        value={formData.email}
        onChange={handleChange}
        required
        className="form-input connect-form__email"
        disabled={status === "loading"}
      />
      <input
        type="text"
        name="org"
        placeholder="Organization (optional)"
        value={formData.org}
        onChange={handleChange}
        className="form-input connect-form__org"
        disabled={status === "loading"}
      />

      <div className="connect-form__interests">
        <p className="connect-form__interests-label">I'm also interested in... (optional)</p>
        <div className="connect-form__pills">
          {INTERESTS.map((item) => {
            const active = formData.interests.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={`connect-pill${active ? " connect-pill--active" : ""}`}
                onClick={() => toggleInterest(item.id)}
                disabled={status === "loading"}
              >
                {active ? "✓ " : ""}
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <textarea
        name="notes"
        placeholder="Anything you'd like us to know (optional)"
        value={formData.notes}
        onChange={handleChange}
        className="form-input connect-form__notes"
        rows={3}
        disabled={status === "loading"}
      />

      <button
        type="submit"
        className="btn btn--white"
        disabled={status === "loading"}
      >
        {status === "loading" ? "Sending..." : "Let's Connect →"}
      </button>

      {status === "error" && <p className="form-error">{errorMessage}</p>}
    </form>
  );
}

export default function ConnectPage() {
  return (
    <div className="root">
      <style>{connectCSS}</style>
      <div className="connect-page">
        <div className="connect-page__inner">
          <a href="/" className="connect-page__logo">
            <span className="logo__mark">◉</span> PAUSE
          </a>

          <p className="label label--light">Let's Connect</p>
          <h1 className="connect-page__h1">
            We'd love to hear from you<span className="dot">.</span>
          </h1>
          <p className="connect-page__sub">
            Whether you're curious about our newsletter or want to bring the
            Power of Pause workshop to your team, drop your info below and
            we'll follow up.
          </p>

          <ConnectForm />

          <p className="connect-page__footnote">
            Or email us directly at{" "}
            <a href="mailto:hello@pauselab.org" className="connect-page__link">
              hello@pauselab.org
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

const connectCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Satoshi:wght@300;400;500;600&display=swap');

  :root {
    --ink: #141210;
    --warm: #2a2520;
    --mid: #6d6259;
    --soft: #a89d91;
    --cream: #f4efe8;
    --paper: #faf8f5;
    --accent: #b85c38;
    --accent-soft: #cf7e5a;
    --serif: 'Instrument Serif', Georgia, serif;
    --sans: 'Satoshi', system-ui, sans-serif;
  }

  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  html { scroll-behavior:smooth; }
  body { font-family:var(--sans); color:var(--ink); background:var(--ink); -webkit-font-smoothing:antialiased; }
  a { text-decoration:none; color:inherit; }
  button { background:none; border:none; cursor:pointer; font-family:inherit; color:inherit; }
  ::selection { background:var(--accent); color:#fff; }

  .connect-page {
    min-height:100vh; display:flex; align-items:center; justify-content:center;
    padding:60px 24px;
    background:
      radial-gradient(ellipse at 50% 20%, rgba(184,92,56,0.06) 0%, transparent 65%),
      var(--ink);
  }

  .connect-page__inner {
    max-width:560px; width:100%; text-align:center;
  }

  .connect-page__logo {
    display:inline-flex; align-items:center; gap:7px;
    font-weight:600; font-size:15px; letter-spacing:.14em; color:#fff;
    margin-bottom:48px;
  }

  .label { font-size:11.5px; font-weight:500; letter-spacing:.2em; text-transform:uppercase; color:var(--accent); margin-bottom:16px; }
  .label--light { color:var(--accent-soft); }

  .connect-page__h1 {
    font-family:var(--serif); font-size:clamp(30px,5vw,44px); line-height:1.15;
    color:#fff; margin-bottom:20px; font-weight:400;
  }

  .connect-page__sub {
    font-size:clamp(15px,1.8vw,17px); color:var(--soft); line-height:1.75; font-weight:300;
    max-width:440px; margin:0 auto 48px;
  }

  .dot { color:var(--accent); }
  .logo__mark { color:var(--accent); font-size:18px; }

  /* Form */
  .connect-form { width:100%; text-align:left; display:flex; flex-direction:column; gap:24px; }

  .connect-form__fields {
    display:grid; grid-template-columns:1fr 1fr; gap:14px;
  }

  .form-input {
    padding:15px 18px; border:1.5px solid rgba(255,255,255,0.15); border-radius:8px;
    background:rgba(255,255,255,0.05); color:#fff; font-size:15px; font-family:inherit;
    transition:all 0.25s cubic-bezier(.22,1,.36,1); width:100%;
  }
  .form-input::placeholder { color:rgba(255,255,255,0.4); }
  .form-input:focus { outline:none; border-color:rgba(255,255,255,0.3); background:rgba(255,255,255,0.08); }
  .form-input:disabled { opacity:0.5; cursor:not-allowed; }

  .connect-form__interests { margin-top:12px; margin-bottom:12px; }
  .connect-form__interests-label {
    font-size:13px; color:var(--soft); font-weight:400; margin-bottom:12px;
  }
  .connect-form__pills { display:flex; flex-wrap:wrap; gap:12px; }

  .connect-pill {
    padding:10px 20px; border-radius:100px; font-size:14px; font-weight:400;
    border:1.5px solid rgba(255,255,255,0.15); color:var(--soft);
    background:rgba(255,255,255,0.03); transition:all .2s ease; cursor:pointer;
  }
  .connect-pill:hover { border-color:rgba(255,255,255,0.3); color:#fff; }
  .connect-pill--active {
    border-color:var(--accent); color:#fff; background:rgba(184,92,56,0.15);
  }
  .connect-pill:disabled { opacity:0.5; cursor:not-allowed; }

  .connect-form__notes {
    resize:vertical; min-height:80px;
  }

  .btn {
    display:block; width:100%; padding:16px 30px; border-radius:100px;
    font-size:15px; font-weight:500; letter-spacing:.02em; transition:all .25s ease; cursor:pointer;
    margin-top:8px;
  }
  .btn--white { background:#fff; color:var(--ink); border:none; }
  .btn--white:hover { background:var(--cream); transform:translateY(-1px); }

  .form-error {
    color:#ff6b6b; font-size:14px; margin-top:12px;
    padding:12px 16px; background:rgba(255,107,107,0.1); border-radius:6px;
    border:1px solid rgba(255,107,107,0.2);
  }

  .newsletter-success { text-align:center; padding:40px 20px; }
  .success-icon {
    width:64px; height:64px; border-radius:50%; background:rgba(72,187,120,0.15);
    border:2px solid rgba(72,187,120,0.3); color:#48bb78;
    display:flex; align-items:center; justify-content:center;
    font-size:32px; font-weight:600; margin:0 auto 20px;
  }
  .success-message { font-size:20px; color:#fff; font-weight:500; margin-bottom:8px; }
  .newsletter__note { font-size:13px; color:var(--soft); margin-top:8px; font-weight:300; }

  .connect-page__footnote {
    font-size:13px; color:var(--mid); margin-top:32px; font-weight:300;
  }
  .connect-page__link { color:var(--accent); }
  .connect-page__link:hover { text-decoration:underline; }

  @media(max-width:560px) {
    .connect-form__fields { grid-template-columns:1fr; }
    .connect-form__pills { flex-direction:column; }
  }
`;
