import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Upload,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  Moon,
  Sun,
  FileDown,
  History,
  Image as ImageIcon,
  Info,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const MAX_SIZE_MB = 8;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

function downloadJSON(data, filename = "report.json") {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function MedicalClassifierPro() {
  const [dark, setDark] = useState(false);

  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);

  const [fileMeta, setFileMeta] = useState(null); // { name, type, size, width, height }
  const [dragActive, setDragActive] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null); // { type: "success"|"error"|"info", msg }

  const [history, setHistory] = useState([]); // list of { id, date, meta, result }
  const abortRef = useRef({ canceled: false });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Auto-hide toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const getConfidenceColor = (confidence) => {
    if (confidence >= 70) return "bg-red-500";
    if (confidence >= 40) return "bg-yellow-500";
    return "bg-emerald-500";
  };

  const getDiagnosisStyle = (diagnosis) => {
    if (diagnosis === "Normal")
      return "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-900";
    if (diagnosis === "Pneumonie")
      return "text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-300 dark:bg-orange-950/40 dark:border-orange-900";
    return "text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-900";
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
  };

  const validateFile = (file) => {
    if (!file) return "No file selected.";
    if (!ALLOWED_TYPES.includes(file.type))
      return `Unsupported format (${file.type || "unknown"}). Supported: PNG, JPG, JPEG, WEBP.`;
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_SIZE_MB) return `File too large (${sizeMB.toFixed(1)} MB). Max: ${MAX_SIZE_MB} MB.`;
    return "";
  };

  const readImageDimensions = (dataUrl) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => resolve({ width: null, height: null });
      img.src = dataUrl;
    });

  const handleFile = async (file) => {
    setError("");
    setResult(null);
    abortRef.current.canceled = false;

    const err = validateFile(file);
    if (err) {
      setError(err);
      setToast({ type: "error", msg: err });
      return;
    }

    setImage(file);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result;
      setPreview(dataUrl);

      const dims = await readImageDimensions(dataUrl);
      setFileMeta({
        name: file.name,
        type: file.type,
        size: file.size,
        width: dims.width,
        height: dims.height,
      });

      setToast({ type: "success", msg: "Image uploaded ✅" });
    };
    reader.readAsDataURL(file);
  };

  const reset = () => {
    abortRef.current.canceled = true;
    setImage(null);
    setPreview(null);
    setFileMeta(null);
    setResult(null);
    setError("");
    setAnalyzing(false);
    setProgress(0);
    setToast({ type: "info", msg: "Reset complete." });
  };

  const mockPredict = () => {
    const mockResults = [
      {
        predictions: [
          { class: "Normal", confidence: 12.5 },
          { class: "Pneumonie", confidence: 78.3 },
          { class: "Tuberculose", confidence: 9.2 },
        ],
        diagnosis: "Pneumonie",
      },
      {
        predictions: [
          { class: "Normal", confidence: 85.7 },
          { class: "Pneumonie", confidence: 8.1 },
          { class: "Tuberculose", confidence: 6.2 },
        ],
        diagnosis: "Normal",
      },
      {
        predictions: [
          { class: "Normal", confidence: 15.3 },
          { class: "Pneumonie", confidence: 18.4 },
          { class: "Tuberculose", confidence: 66.3 },
        ],
        diagnosis: "Tuberculose",
      },
    ];
    return mockResults[Math.floor(Math.random() * mockResults.length)];
  };

  const analyzeImage = async () => {
    if (!image) return;

    setError("");
    setAnalyzing(true);
    setResult(null);
    setProgress(0);
    abortRef.current.canceled = false;

    // “Realistic” progress
    const start = Date.now();
    const interval = setInterval(() => {
      setProgress((p) => {
        const elapsed = (Date.now() - start) / 1000;
        const target = 100 * (1 - Math.exp(-elapsed / 1.6));
        return clamp(Math.max(p, target), 0, 92);
      });
    }, 120);

    try {
      // ✅ MOCK (replace with your API if you want)
      await new Promise((r) => setTimeout(r, 2000));
      if (abortRef.current.canceled) return;

      const data = mockPredict();

      clearInterval(interval);
      setProgress(100);
      setResult(data);
      setAnalyzing(false);

      const entry = {
        id: crypto?.randomUUID?.() || String(Date.now()),
        date: new Date().toISOString(),
        meta: fileMeta,
        result: data,
      };
      setHistory((h) => [entry, ...h].slice(0, 8));
      setToast({ type: "success", msg: "Analysis completed ✅" });

      /* ✅ TO CONNECT TO YOUR REAL API:
      const formData = new FormData();
      formData.append("file", image);
      const response = await fetch("http://localhost:8000/predict", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("API error");
      const data = await response.json();
      ... then keep the same logic as above
      */
    } catch (e) {
      clearInterval(interval);
      setAnalyzing(false);
      setProgress(0);
      const msg = "Error during analysis. Please try again.";
      setError(msg);
      setToast({ type: "error", msg });
    }
  };

  const topPrediction = useMemo(() => {
    if (!result?.predictions?.length) return null;
    return [...result.predictions].sort((a, b) => b.confidence - a.confidence)[0];
  }, [result]);

  const loadFromHistory = (item) => {
    setResult(item.result);
    setToast({ type: "info", msg: "Result restored from history." });
  };

  const baseBg =
    "min-h-screen p-4 md:p-8 transition-colors " +
    (dark
      ? "bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100"
      : "bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-100 text-slate-900");

  const card =
    "rounded-3xl shadow-xl border backdrop-blur " +
    (dark ? "bg-white/5 border-white/10" : "bg-white/70 border-black/5");

  return (
    <div className={baseBg}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Medical Vision Lab
            </h1>
            <p className={dark ? "text-slate-300 mt-2" : "text-slate-600 mt-2"}>
              AI-powered image classification (Pneumonia / Tuberculosis) — fast, clean, and demo-ready.
            </p>

            {/* Added: trust & value props */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className={
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-extrabold " +
                  (dark ? "bg-white/5 border-white/10 text-slate-100" : "bg-white/70 border-black/10 text-slate-800")
                }
              >
                <Sparkles className="w-4 h-4" />
                Smooth UX • Instant insights
              </span>
              <span
                className={
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-extrabold " +
                  (dark ? "bg-white/5 border-white/10 text-slate-100" : "bg-white/70 border-black/10 text-slate-800")
                }
              >
                <ShieldCheck className="w-4 h-4" />
                Privacy-first • Local demo mode
              </span>
              <span
                className={
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-extrabold " +
                  (dark ? "bg-white/5 border-white/10 text-slate-100" : "bg-white/70 border-black/10 text-slate-800")
                }
              >
                Supported: PNG / JPG / WEBP (≤ {MAX_SIZE_MB}MB)
              </span>
            </div>
          </div>

          <button
            onClick={() => setDark((d) => !d)}
            className={
              "inline-flex items-center gap-2 px-4 py-2 rounded-xl border transition " +
              (dark
                ? "bg-white/5 border-white/10 hover:bg-white/10"
                : "bg-white/70 border-black/10 hover:bg-white")
            }
            aria-label="Toggle theme"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="text-sm font-semibold">{dark ? "Light" : "Dark"}</span>
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={
              "fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl shadow-lg border flex items-center gap-2 " +
              (toast.type === "success"
                ? "bg-emerald-600/90 border-emerald-300/30 text-white"
                : toast.type === "error"
                ? "bg-red-600/90 border-red-300/30 text-white"
                : "bg-slate-900/90 border-white/10 text-white")
            }
          >
            {toast.type === "success" ? (
              <CheckCircle className="w-5 h-5" />
            ) : toast.type === "error" ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <Info className="w-5 h-5" />
            )}
            <span className="text-sm font-semibold">{toast.msg}</span>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className={"lg:col-span-2 " + card}>
            <div className="p-6 md:p-8">
              {!preview ? (
                <div
                  className={
                    "rounded-2xl border-2 border-dashed p-10 md:p-14 text-center transition-all " +
                    (dragActive
                      ? dark
                        ? "border-indigo-400 bg-indigo-500/10"
                        : "border-indigo-500 bg-indigo-50"
                      : dark
                      ? "border-white/15 bg-white/5"
                      : "border-slate-300 bg-white/40")
                  }
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleChange}
                  />

                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                    <div
                      className={
                        "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 " +
                        (dark ? "bg-white/10" : "bg-indigo-100")
                      }
                    >
                      <Upload className={dark ? "w-8 h-8 text-indigo-200" : "w-8 h-8 text-indigo-700"} />
                    </div>

                    <p className="text-xl font-bold">
                      Drag & drop an image here, or click to upload
                    </p>
                    <p className={dark ? "text-slate-300 mt-2" : "text-slate-600 mt-2"}>
                      PNG / JPG / WEBP — up to {MAX_SIZE_MB}MB
                    </p>

                    {error && (
                      <div
                        className={
                          "mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl border " +
                          (dark
                            ? "bg-red-500/10 border-red-500/30 text-red-200"
                            : "bg-red-50 border-red-200 text-red-700")
                        }
                      >
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-semibold">{error}</span>
                      </div>
                    )}
                  </label>
                </div>
              ) : (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-2">
                      <ImageIcon className={dark ? "w-5 h-5 text-indigo-200" : "w-5 h-5 text-indigo-700"} />
                      <h2 className="text-2xl font-extrabold">Analysis</h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadJSON({ meta: fileMeta, result }, "analysis_report.json")}
                        disabled={!result}
                        className={
                          "inline-flex items-center gap-2 px-4 py-2 rounded-xl border transition disabled:opacity-50 disabled:cursor-not-allowed " +
                          (dark
                            ? "bg-white/5 border-white/10 hover:bg-white/10"
                            : "bg-white/70 border-black/10 hover:bg-white")
                        }
                      >
                        <FileDown className="w-4 h-4" />
                        <span className="text-sm font-semibold">Download report</span>
                      </button>

                      <button
                        onClick={reset}
                        className={
                          "inline-flex items-center gap-2 px-4 py-2 rounded-xl border transition " +
                          (dark
                            ? "bg-white/5 border-white/10 hover:bg-white/10"
                            : "bg-white/70 border-black/10 hover:bg-white")
                        }
                      >
                        <X className="w-4 h-4" />
                        <span className="text-sm font-semibold">New image</span>
                      </button>
                    </div>
                  </div>

                  {/* Meta */}
                  {fileMeta && (
                    <div
                      className={
                        "mb-6 rounded-2xl p-4 border flex flex-wrap gap-3 items-center justify-between " +
                        (dark ? "bg-white/5 border-white/10" : "bg-white/60 border-black/5")
                      }
                    >
                      <div className="min-w-[220px]">
                        <p className="text-sm font-bold">{fileMeta.name}</p>
                        <p className={dark ? "text-slate-300 text-xs" : "text-slate-600 text-xs"}>
                          {fileMeta.type} • {formatBytes(fileMeta.size)} • {fileMeta.width}×{fileMeta.height}
                        </p>
                      </div>

                      {topPrediction && (
                        <div
                          className={
                            "px-3 py-2 rounded-xl border text-sm font-bold " +
                            (dark
                              ? "bg-indigo-500/10 border-indigo-400/20 text-indigo-200"
                              : "bg-indigo-50 border-indigo-200 text-indigo-800")
                          }
                        >
                          Top: {topPrediction.class} ({topPrediction.confidence.toFixed(1)}%)
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Preview */}
                    <div>
                      <p className={dark ? "text-slate-300 text-sm mb-2" : "text-slate-600 text-sm mb-2"}>
                        Image
                      </p>
                      <div className={"rounded-2xl overflow-hidden border " + (dark ? "border-white/10" : "border-black/5")}>
                        <img src={preview} alt="Preview" className="w-full h-auto" />
                      </div>
                    </div>

                    {/* Results */}
                    <div>
                      <p className={dark ? "text-slate-300 text-sm mb-2" : "text-slate-600 text-sm mb-2"}>
                        Results
                      </p>

                      {!result && !analyzing && (
                        <button
                          onClick={analyzeImage}
                          className={
                            "w-full py-3 rounded-2xl font-extrabold transition shadow-lg " +
                            (dark
                              ? "bg-indigo-500 hover:bg-indigo-400 text-slate-950"
                              : "bg-indigo-600 hover:bg-indigo-700 text-white")
                          }
                        >
                          Start analysis
                        </button>
                      )}

                      {analyzing && (
                        <div className={"rounded-2xl p-5 border " + (dark ? "bg-white/5 border-white/10" : "bg-white/60 border-black/5")}>
                          <div className="flex items-center gap-3">
                            <Loader2 className={dark ? "w-6 h-6 animate-spin text-indigo-200" : "w-6 h-6 animate-spin text-indigo-700"} />
                            <div className="flex-1">
                              <p className="font-bold">Analyzing…</p>
                              <p className={dark ? "text-slate-300 text-sm" : "text-slate-600 text-sm"}>
                                Optimization + feature extraction + prediction
                              </p>
                            </div>
                            <span className="text-sm font-extrabold">{Math.round(progress)}%</span>
                          </div>

                          <div className={"mt-4 h-3 rounded-full overflow-hidden " + (dark ? "bg-white/10" : "bg-slate-200")}>
                            <div
                              className={"h-3 rounded-full transition-all " + (dark ? "bg-indigo-300" : "bg-indigo-600")}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {result && (
                        <div className="space-y-4">
                          <div className={"p-4 rounded-2xl border-2 " + getDiagnosisStyle(result.diagnosis)}>
                            <div className="flex items-center gap-2 mb-1">
                              {result.diagnosis === "Normal" ? (
                                <CheckCircle className="w-5 h-5" />
                              ) : (
                                <AlertCircle className="w-5 h-5" />
                              )}
                              <span className="font-extrabold">AI assessment</span>
                            </div>
                            <p className="text-3xl font-black">{result.diagnosis}</p>
                          </div>

                          <div className={"rounded-2xl p-4 border " + (dark ? "bg-white/5 border-white/10" : "bg-white/60 border-black/5")}>
                            <p className="font-extrabold mb-3">Confidence</p>

                            <div className="space-y-3">
                              {result.predictions.map((pred, idx) => (
                                <div key={idx}>
                                  <div className="flex justify-between text-sm mb-1">
                                    <span className={dark ? "text-slate-200 font-bold" : "text-slate-800 font-bold"}>
                                      {pred.class}
                                    </span>
                                    <span className="font-extrabold">{pred.confidence.toFixed(1)}%</span>
                                  </div>
                                  <div className={dark ? "w-full bg-white/10 rounded-full h-3" : "w-full bg-slate-200 rounded-full h-3"}>
                                    <div
                                      className={"h-3 rounded-full transition-all duration-500 " + getConfidenceColor(pred.confidence)}
                                      style={{ width: `${pred.confidence}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className={"rounded-2xl p-3 border " + (dark ? "bg-yellow-500/10 border-yellow-500/20" : "bg-yellow-50 border-yellow-200")}>
                            <p className={dark ? "text-yellow-200 text-xs" : "text-yellow-800 text-xs"}>
                              <strong>Disclaimer:</strong> This AI result is informational only and does not replace a medical diagnosis.
                            </p>
                          </div>
                        </div>
                      )}

                      {error && (
                        <div
                          className={
                            "mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl border " +
                            (dark
                              ? "bg-red-500/10 border-red-500/30 text-red-200"
                              : "bg-red-50 border-red-200 text-red-700")
                          }
                        >
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm font-semibold">{error}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Side panel: History */}
          <div className={card}>
            <div className="p-6 md:p-7">
              <div className="flex items-center gap-2 mb-4">
                <History className={dark ? "w-5 h-5 text-indigo-200" : "w-5 h-5 text-indigo-700"} />
                <h3 className="text-xl font-extrabold">History</h3>
              </div>

              {history.length === 0 ? (
                <div className={dark ? "text-slate-300 text-sm" : "text-slate-600 text-sm"}>
                  No analyses yet. Run an analysis to populate your history.
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((h) => {
                    const date = new Date(h.date);
                    return (
                      <button
                        key={h.id}
                        onClick={() => loadFromHistory(h)}
                        className={
                          "w-full text-left rounded-2xl p-4 border transition " +
                          (dark
                            ? "bg-white/5 border-white/10 hover:bg-white/10"
                            : "bg-white/60 border-black/5 hover:bg-white")
                        }
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-extrabold">{h.result?.diagnosis || "—"}</p>
                            <p className={dark ? "text-slate-300 text-xs" : "text-slate-600 text-xs"}>
                              {date.toLocaleString()}
                            </p>
                          </div>
                          <span
                            className={
                              "text-xs font-extrabold px-2 py-1 rounded-xl border " +
                              (dark ? "border-white/10 bg-white/5" : "border-black/10 bg-white")
                            }
                          >
                            {h.meta?.width}×{h.meta?.height}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className={"mt-6 rounded-2xl p-4 border " + (dark ? "bg-white/5 border-white/10" : "bg-white/60 border-black/5")}>
                <div className="flex items-start gap-3">
                  <Info className={dark ? "w-5 h-5 text-slate-200 mt-0.5" : "w-5 h-5 text-slate-700 mt-0.5"} />
                  <div>
                    <p className="font-extrabold">Tip</p>
                    <p className={dark ? "text-slate-300 text-sm" : "text-slate-600 text-sm"}>
                      Connect your FastAPI/Node backend by replacing the mock logic inside{" "}
                      <code className="font-bold">analyzeImage()</code>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Added: quick reassurance */}
              <div className={"mt-3 rounded-2xl p-4 border " + (dark ? "bg-white/5 border-white/10" : "bg-white/60 border-black/5")}>
                <p className={dark ? "text-slate-300 text-sm" : "text-slate-600 text-sm"}>
                  <span className="font-extrabold">Client-ready:</span> clean UI, exportable report, and a smooth analysis flow for demos.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={dark ? "mt-6 text-center text-xs text-slate-400" : "mt-6 text-center text-xs text-slate-600"}>
          <p>Medical Vision Lab — Demo interface. AI results are indicative only.</p>
          <p className="mt-1">
            Project done by <span className="font-bold">Ibrahim Al Ayoubi</span>
          </p>
        </div>
      </div>
    </div>
  );
}