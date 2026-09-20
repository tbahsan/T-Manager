<div align="center">

<img src="docs/assets/banner.png" alt="T-Manager" width="100%"/>

# T-Manager — ইউটিউব চ্যানেল ম্যানেজার

**ব্যাচ রিনেম (বাংলা নাম্বারিং সহ) · থাম্বনেইল · ডেসক্রিপশন ও ট্যাগ · রিজিউমেবল আপলোড · আয়-সহ অ্যানালিটিক্স · মাল্টি-চ্যানেল — Chrome, Firefox ও Firefox for Android-এ।**

[![License: MIT](https://img.shields.io/badge/License-MIT-ff0033?style=flat-square)](LICENSE)
[![Made in Bangladesh](https://img.shields.io/badge/Made%20in-%F0%9F%87%A7%F0%9F%87%A9%20Bangladesh-006a4e?style=flat-square)](https://github.com/tbahsan)

**[🌐 ওয়েবসাইট](https://tbahsan.github.io/t-manager/)** · **[⬇️ ডাউনলোড](https://github.com/tbahsan/T-Manager/releases/latest)** · **[🐛 বাগ জানান](../../issues/new?template=bug_report.yml)** · **[💡 ফিচার চান](../../issues/new?template=feature_request.yml)** · **[English](README.md)**

</div>

---

## 🤔 কেন?

১০০টা ভিডিওর টাইটেল বদলানো বা গোছানো আপলোড মানে একেকটা করে ক্লিক করা। T-Manager করে দেয় **এক পাসে** — আগে প্রিভিউ, আগে কোটা হিসাব, পরে কাজ; ভুল হলে ফুল আনডু।

## ✨ ফিচার

| | ফিচার | বিবরণ |
|---|---|---|
| ✏️ | **ব্যাচ রিনেম + নাম্বারিং** | ৪ mode — Replace · **Prepend (মূল টাইটেল অক্ষুণ্ণ)** ⭐ · Append · Custom · `শর্ট-১`, `লং-২` · বাংলা/ইংরেজি সংখ্যা · zero-pad · নাম্বারের আগে-পরে যেকোনো লেখা |
| 🖼️ | **ব্যাচ থাম্বনেইল** | এক ছবি সবখানে বা প্রতি ভিডিওতে আলাদা · validation · side-by-side প্রিভিউ |
| 📝 | **ব্যাচ ডেসক্রিপশন** | Replace / **Append** ⭐ / Prepend · `{existing}` ও `{date}` placeholder |
| 🏷️ | **ব্যাচ ট্যাগ** | Merge (ডুপ্লিকেট-নিরাপদ) ⭐ / Replace / Remove · ৫০০-অক্ষর গার্ড |
| ⬆️ | **আপলোড কিউ** | বহু ফাইল → অটো নাম্বারিং টাইটেল · **৫ MB resumable chunk** — নেট কাটলেও সেখান থেকেই চলে · প্রতি ব্যাচে privacy নিশ্চিতকরণ |
| 📊 | **অ্যানালিটিক্স** | Views, watch time, subscribers, CTR · monetized চ্যানেলে **আয় + RPM** · ৬ ঘণ্টা cache |
| 👥 | **মাল্টি-চ্যানেল** | একাধিক চ্যানেল, এক ক্লিকে switch — ডেটা সম্পূর্ণ আলাদা |
| ⚡ | **কোটা ট্র্যাকার** | প্রতিটা কাজের ইউনিট-খরচ চালানোর **আগেই** দেখায় |
| ↩️ | **ফুল আনডু** | প্রতি ব্যাচ আগে snapshot নেয় — এক ক্লিকে ফেরান |
| 🌐 | **English + বাংলা** | ডিফল্ট English, এক ক্লিকে বাংলা |

## 📦 ইনস্টল (২ মিনিট)

1. **ডাউনলোড** [`t-manager-chrome.zip`](https://github.com/tbahsan/T-Manager/releases/latest/download/t-manager-chrome.zip) বা [`t-manager-firefox.zip`](https://github.com/tbahsan/T-Manager/releases/latest/download/t-manager-firefox.zip) → unzip
2. **Chrome:** `chrome://extensions` → Developer mode → **Load unpacked** → ফোল্ডার সিলেক্ট
   **Firefox:** `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…** → `manifest.json`
3. Popup → **Connect YouTube** → শেষ ✅

## ⚡ কোটার সৎ হিসাব

Google প্রতি প্রজেক্টে দেয় **১০,০০০ ইউনিট/দিন**:

| কাজ | খরচ | নোট |
|---|---|---|
| ভিডিও তালিকা (×৫০) | `১u` | cache হয় — প্রিভিউ ও আনডু ফ্রি |
| রিনেম + ডেসক্রিপশন + ট্যাগ | `৫০u`/ভিডিও | **এক কলেই** — ১৫০ নয় |
| থাম্বনেইল | `৫০u`/ভিডিও | |
| অ্যানালিটিক্স | `≈১u` | আলাদা quota + ৬ ঘণ্টা cache |
| আপলোড | `১,৬০০u`/ভিডিও | hard gate + "কাল resume" |

বেশি ব্যবহার করেন? **Pro mode**-এ নিজের client ID দিন — নিজের কোটা। গাইড: [docs/QUOTA.md](docs/QUOTA.md)

## 🐛💡 মতামত ও পরামর্শ

T-Manager আপনাদের বাস্তব কাজের অভিজ্ঞতা থেকেই এগিয়ে যাক:

| | |
|---|---|
| 🐛 **কোনো বাগ পেয়েছেন?** | **[বাগ রিপোর্ট খুলুন](../../issues/new?template=bug_report.yml)** — কোন এলাকা, কোন ব্রাউজার, কী ধাপে হলো লিখলে দ্রুত ঠিক হয় |
| 💡 **নতুন ফিচারের আইডিয়া?** | **[ফিচার রিকোয়েস্ট করুন](../../issues/new?template=feature_request.yml)** — আপনার সমস্যাটা বলুন; সেরা আইডিয়া roadmap-এ যোগ হয় |
| ❓ **প্রশ্ন?** | **[Discussions](../../discussions)**-এ করুন |

> 💬 প্রতিটা "আপনিই চেয়েছিলেন, আমরা বানিয়েছি"-র শুরু একটা issue দিয়ে।

## 🧑‍💻 ডেভেলপার

```bash
git clone https://github.com/tbahsan/T-Manager && cd T-Manager
npm install && npm run build && npm test
```

**পঠনযোগ্যতাই ফিচার** — প্রতিটা ফাইলে header + JSDoc ([নিয়ম](CONTRIBUTING.md))।

## 👤 নির্মাতা

<div align="center">

**তাসনীম বিন আহসান (TBA)** — ওয়েব ডিজাইনার ও ডেভেলপার, 🇧🇩 বাংলাদেশ

[GitHub](https://github.com/tbahsan) · [X @tbahsan](https://x.com/tbahsan) · [YouTube @TBAhsan](https://www.youtube.com/@TBAhsan) · [tlogz.com](https://tlogz.com/)

</div>

## ⚖️ লাইসেন্স

[MIT](LICENSE) · © ২০২৬ তাসনীম বিন আহসান (TBA) · YouTube/Google-এর সাথে কোনো সম্পর্ক নেই।

<div align="center">
<sub>❤️ দিয়ে তৈরি, বাংলাদেশে — সময় বাঁচালে একটা ⭐ দিয়ে যান!</sub>
</div>
