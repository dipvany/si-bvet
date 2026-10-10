import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./ManajemenPeternakanLayer.css";

const HDEP_CURVE = [[16, 2], [18, 10], [20, 50], [22, 75], [24, 88], [28, 93], [45, 92], [60, 89], [72, 84], [80, 79], [90, 72]];
const FEED_CURVE = [[16, 70], [18, 85], [22, 100], [26, 110], [32, 113], [50, 115], [72, 118], [90, 120]];
const FCR_TARGET = 2;
const VAX_SCHEDULE = [
  { day: 1, name: "Marek's Disease", method: "In-ovo / hatchery" },
  { day: 4, name: "ND-IB Live (1)", method: "Tetes mata" },
  { day: 10, name: "Gumboro / IBD Live (1)", method: "Tetes mulut/air minum" },
  { day: 14, name: "AI (Avian Influenza) (1)", method: "Suntik (killed)" },
  { day: 18, name: "Gumboro / IBD Live (2)", method: "Air minum" },
  { day: 21, name: "ND-IB Live (2)", method: "Tetes mata/spray" },
  { day: 28, name: "Fowl Pox", method: "Tusuk sayap" },
  { day: 35, name: "Coryza Killed (1)", method: "Suntik" },
  { day: 56, name: "ND Killed + IB", method: "Suntik" },
  { day: 70, name: "Coryza Killed (2)", method: "Suntik (booster)" },
  { day: 84, name: "AI (Avian Influenza) (2)", method: "Suntik (booster)" },
  { day: 112, name: "ND-IB-EDS Killed (pre-layer)", method: "Suntik" },
];

const TABS = [
  ["ringkasan", "Ringkasan & Benchmark"],
  ["produksi", "Produksi & Pakan"],
  ["kandang", "Kondisi Kandang"],
  ["vaksin", "Vaksinasi & Kesehatan"],
  ["skor", "Skor KPI Komposit"],
];

const INITIAL_INPUTS = {
  age: 32,
  population: 600,
  eggs: 550,
  eggWeight: 61,
  feed: 112,
  temperature: 24,
  humidity: 62,
  ammonia: 15,
  density: 500,
  light: 16,
  sanitation: 4,
  initialPopulation: 650,
  weeklyMortality: 0.12,
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const formatInt = (value) => Math.round(value).toLocaleString("id-ID");
const interpolate = (points, value) => {
  if (value <= points[0][0]) return points[0][1];
  if (value >= points[points.length - 1][0]) return points[points.length - 1][1];
  for (let index = 0; index < points.length - 1; index += 1) {
    const [x0, y0] = points[index];
    const [x1, y1] = points[index + 1];
    if (value >= x0 && value <= x1) {
      const proportion = (value - x0) / (x1 - x0);
      return y0 + (y1 - y0) * proportion;
    }
  }
  return points[points.length - 1][1];
};

function calculateDashboard(inputs, vaccinationStatus) {
  const {
    age, population, eggs, eggWeight, feed, temperature, humidity,
    ammonia, density, light, sanitation, initialPopulation, weeklyMortality,
  } = inputs;
  const hdep = population > 0 ? eggs / population * 100 : 0;
  const hdepStandard = interpolate(HDEP_CURVE, age);
  const eggMass = hdep / 100 * eggWeight;
  const feedStandard = interpolate(FEED_CURVE, age);
  const fcr = eggMass > 0 ? feed / eggMass : 0;
  const production = {
    age, population, eggs, eggWeight, feed, hdep, hdepStandard, eggMass,
    feedStandard, fcr,
    hdepScore: clamp(hdep / hdepStandard * 100, 0, 100),
    feedScore: clamp(100 - Math.abs(feed - feedStandard) / feedStandard * 200, 0, 100),
    fcrScore: fcr > 0 ? clamp(FCR_TARGET / fcr * 100, 0, 100) : 0,
  };

  const temperatureScore = clamp(100 - Math.abs(temperature - 21) * 8, 0, 100);
  const humidityScore = clamp(100 - Math.abs(humidity - 60) * 3, 0, 100);
  const ammoniaScore = clamp(100 - Math.max(0, ammonia - 20) * 5, 0, 100);
  const densityScore = density >= 450 ? 100 : clamp(density / 450 * 100, 0, 100);
  const lightScore = clamp(100 - Math.abs(light - 16) * 12, 0, 100);
  const sanitationScore = sanitation / 5 * 100;
  const housing = {
    temperature, humidity, ammonia, density, light, sanitation,
    temperatureScore, humidityScore, ammoniaScore, densityScore, lightScore, sanitationScore,
    score: (temperatureScore + humidityScore + ammoniaScore + densityScore + lightScore + sanitationScore) / 6,
  };

  const dueVaccines = VAX_SCHEDULE.map((vaccine, index) => ({ ...vaccine, index }))
    .filter((vaccine) => age * 7 >= vaccine.day);
  const completedDue = dueVaccines.filter((vaccine) => vaccinationStatus[vaccine.index]).length;
  const compliance = dueVaccines.length > 0 ? completedDue / dueVaccines.length * 100 : 100;
  const livability = population > 0 && initialPopulation > 0 ? population / initialPopulation * 100 : 100;
  const livabilityScore = clamp(livability / 95 * 100, 0, 100);
  const mortality = weeklyMortality / 100;
  const mortalityScore = clamp(100 - Math.max(0, mortality - 0.0015) / 0.0015 * 100, 0, 100);
  const health = {
    dueVaccines, completedDue, compliance, livability, livabilityScore,
    mortality, mortalityScore, score: (livabilityScore + mortalityScore) / 2,
  };

  const productionScore = production.hdepScore * 0.6
    + Math.max(0, 100 - Math.abs(fcr > 0 ? (fcr - FCR_TARGET) / FCR_TARGET * 100 : 0)) * 0.4;
  const scores = {
    produksi: clamp(productionScore, 0, 100),
    pakan: clamp((production.feedScore + production.fcrScore) / 2, 0, 100),
    kandang: clamp(housing.score, 0, 100),
    kesehatan: clamp(health.score, 0, 100),
    vaksin: clamp(compliance, 0, 100),
  };
  const weights = { produksi: 0.3, pakan: 0.2, kandang: 0.15, kesehatan: 0.2, vaksin: 0.15 };
  const overall = Object.entries(scores).reduce((total, [key, score]) => total + score * weights[key], 0);
  const status = overall < 55 ? "Kritis" : overall < 70 ? "Perlu Perhatian" : overall < 85 ? "Baik" : "Sangat Baik";
  return { production, housing, health, scores, weights, overall, status };
}

function Field({ label, value, min, max, step = 1, format = (current) => current, onChange }) {
  return (
    <div className="layer-field">
      <label>
        <span>{label}</span>
        <b>{format(value)}</b>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        aria-label={label}
      />
    </div>
  );
}

function InputGroup({ title, children }) {
  return <div className="layer-control-group"><h4>{title}</h4>{children}</div>;
}

function Kpi({ label, value, tone = "" }) {
  return <div className={`layer-kpi ${tone}`}><div className="layer-kpi-label">{label}</div><div className="layer-kpi-value">{value}</div></div>;
}

function LineChart({ age, actual, standard }) {
  const width = 720;
  const height = 300;
  const padLeft = 48;
  const padRight = 14;
  const padTop = 14;
  const padBottom = 32;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;
  const weeks = standard.map(([week]) => week);
  const standardValues = standard.map(([, value]) => value);
  const selectedIndex = clamp(Math.round((age - 16) / 2), 0, standardValues.length - 1);
  const actualValues = standardValues.map((value, index) => index === selectedIndex ? actual : value);
  const yMax = Math.max(1, ...standardValues, ...actualValues) * 1.12;
  const x = (week) => padLeft + (week - weeks[0]) / (weeks[weeks.length - 1] - weeks[0] || 1) * plotWidth;
  const y = (value) => padTop + plotHeight - value / yMax * plotHeight;
  const linePath = (values) => values.map((value, index) => `${index ? "L" : "M"}${x(weeks[index]).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
  const xStep = Math.max(1, Math.round(weeks.length / 8));
  return (
    <div className="layer-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Grafik HDEP aktual dan standar usia">
        {[0, 1, 2, 3, 4].map((tick) => {
          const value = yMax * tick / 4;
          return <g key={tick}>
            <line x1={padLeft} x2={width - padRight} y1={y(value)} y2={y(value)} className="layer-grid-line" />
            <text x={4} y={y(value) + 4} className="layer-axis-label">{Math.round(value)}</text>
          </g>;
        })}
        {weeks.filter((_, index) => index % xStep === 0).map((week) => (
          <text key={week} x={x(week)} y={height - 14} textAnchor="middle" className="layer-axis-label">{Math.round(week)}</text>
        ))}
        <path d={linePath(standardValues)} className="layer-line-standard" />
        <path d={linePath(actualValues)} className="layer-line-actual" />
        <circle cx={x(weeks[selectedIndex])} cy={y(actual)} r="4" className="layer-point-actual" />
        <text x={padLeft + plotWidth / 2} y={height - 2} textAnchor="middle" className="layer-axis-label">Umur (minggu)</text>
      </svg>
    </div>
  );
}

function BarChart({ labels, values, colors }) {
  const width = 720;
  const height = 300;
  const left = 52;
  const right = width - 18;
  const top = 18;
  const bottom = height - 48;
  const max = Math.max(100, ...values);
  const slot = (right - left) / labels.length;
  return (
    <div className="layer-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Grafik indikator kondisi">
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = bottom - tick / max * (bottom - top);
          return <g key={tick}>
            <line x1={left} x2={right} y1={y} y2={y} className="layer-grid-line" />
            <text x={left - 8} y={y + 4} textAnchor="end" className="layer-axis-label">{tick}</text>
          </g>;
        })}
        {labels.map((label, index) => {
          const barWidth = Math.min(slot * 0.58, 64);
          const barHeight = values[index] / max * (bottom - top);
          const barX = left + slot * index + (slot - barWidth) / 2;
          return <g key={label}>
            <rect x={barX} y={bottom - barHeight} width={barWidth} height={barHeight} fill={colors[index]} rx="2" />
            <text x={barX + barWidth / 2} y={bottom - barHeight - 7} textAnchor="middle" className="layer-bar-value">{Math.round(values[index])}</text>
            <text x={barX + barWidth / 2} y={height - 15} textAnchor="middle" className="layer-axis-label">{label}</text>
          </g>;
        })}
      </svg>
    </div>
  );
}

function RadarChart({ labels, values }) {
  const size = 360;
  const center = size / 2;
  const radius = 108;
  const point = (index, scale) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / labels.length;
    return [center + radius * scale * Math.cos(angle), center + radius * scale * Math.sin(angle)];
  };
  const valuePoints = values.map((value, index) => point(index, clamp(value, 0, 100) / 100));
  const polygon = valuePoints.map(([px, py]) => `${px},${py}`).join(" ");
  return (
    <div className="layer-chart layer-radar">
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Grafik radar skor KPI">
        {[0.25, 0.5, 0.75, 1].map((scale) => <polygon key={scale}
          points={labels.map((_, index) => point(index, scale).join(",")).join(" ")}
          className="layer-radar-grid" />)}
        {labels.map((label, index) => {
          const [px, py] = point(index, 1);
          const [lx, ly] = point(index, 1.25);
          const [vx, vy] = point(index, clamp(values[index], 0, 100) / 100);
          return <g key={label}>
            <line x1={center} y1={center} x2={px} y2={py} className="layer-radar-axis" />
            <text x={lx} y={ly} textAnchor={lx < center - 12 ? "end" : lx > center + 12 ? "start" : "middle"} className="layer-radar-label">{label}</text>
            <text x={vx} y={vy - 8} textAnchor="middle" className="layer-radar-value">{Math.round(values[index])}</text>
          </g>;
        })}
        <polygon points={polygon} className="layer-radar-score" />
      </svg>
    </div>
  );
}

function ControlField({ label, value, setValue, ...props }) {
  return <Field label={label} value={value} {...props} onChange={setValue} />;
}

export default function ManajemenPeternakanLayer() {
  const [inputs, setInputs] = useState(INITIAL_INPUTS);
  const [activeTab, setActiveTab] = useState("ringkasan");
  const [vaccinationStatus, setVaccinationStatus] = useState(() => VAX_SCHEDULE.map(() => false));
  const dashboard = useMemo(() => calculateDashboard(inputs, vaccinationStatus), [inputs, vaccinationStatus]);
  const { production, housing, health, scores, weights, overall, status } = dashboard;

  const updateInput = (key) => (value) => setInputs((current) => ({ ...current, [key]: value }));
  const toggleVaccination = (index) => setVaccinationStatus((current) => current.map((done, item) => item === index ? !done : done));
  const statusTone = overall < 55 ? "critical" : overall < 70 ? "attention" : overall < 85 ? "good" : "excellent";
  const hdepAgeCurve = Array.from({ length: 38 }, (_, index) => {
    const week = 16 + index * 2;
    return [week, interpolate(HDEP_CURVE, week)];
  });
  const metricRows = [
    ["Produksi Telur (HDEP & kestabilan)", scores.produksi, weights.produksi],
    ["Pakan & FCR", scores.pakan, weights.pakan],
    ["Kondisi Kandang", scores.kandang, weights.kandang],
    ["Kesehatan / Mortalitas", scores.kesehatan, weights.kesehatan],
    ["Kepatuhan Vaksinasi", scores.vaksin, weights.vaksin],
  ];
  const pillTone = (score) => score >= 80 ? "positive" : score >= 60 ? "middle" : "negative";
  const vaxAge = (day) => (Math.round(day / 7 * 10) / 10).toLocaleString("id-ID");

  return (
    <div className="layer-dashboard">
      <header className="layer-hero">
        <div className="layer-hero-inner">
          <p className="layer-kicker">DASHBOARD MANAJEMEN PETERNAKAN — AYAM LAYER (PETELUR)</p>
          <h1>Dashboard KPI Ayam Merah Putih — BV Lampung</h1>
          <p className="layer-hero-copy">Menghitung indikator kinerja utama dari data intake pakan, produksi telur, kondisi kandang, dan kepatuhan vaksinasi — dibandingkan terhadap standar industri, lalu dirangkum menjadi satu skor KPI komposit untuk pengambilan keputusan cepat.</p>
          <div className="layer-hero-stats">
            <div><b>90–98%</b><span>Hen-Day Production puncak (kandang baterai modern)</span></div>
            <div><b>1,9–2,1</b><span>FCR target (kg pakan/kg telur)</span></div>
            <div><b>110–115 g</b><span>Konsumsi pakan standar/ekor/hari saat puncak</span></div>
            <div><b>≥95%</b><span>Target livability (tingkat hidup) periode layer</span></div>
          </div>
        </div>
      </header>

      <main className="layer-wrap">
        <div className="layer-top-actions">
          <Link to="/" className="layer-home-link">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M12.5 4.5 7 10l5.5 5.5M7.5 10h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Kembali ke beranda
          </Link>
        </div>
        <div className="layer-tabs" role="tablist" aria-label="Bagian dashboard peternakan">
          {TABS.map(([key, label]) => <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeTab === key}
            className={`layer-tab-button ${activeTab === key ? "active" : ""}`}
            onClick={() => setActiveTab(key)}
          >{label}</button>)}
        </div>

        {activeTab === "ringkasan" && <div role="tabpanel">
          <section className="layer-card">
            <h2>Empat pilar KPI peternakan layer</h2>
            <p className="layer-note">Kinerja flok layer paling baik dinilai secara terpadu: produksi dan efisiensi pakan, kondisi kandang, serta kesehatan dan kepatuhan program vaksinasi.</p>
            <div className="layer-fact-grid">
              <div><b>90–98%</b><span>Hen-Day Egg Production (HDEP) puncak pada sistem kandang baterai modern, usia sekitar 25–45 minggu.</span></div>
              <div><b>1,9–2,1 kg</b><span>FCR (kg pakan / kg massa telur) target sistem kandang modern.</span></div>
              <div><b>110–115 g/ekor/hari</b><span>Konsumsi pakan standar saat puncak produksi untuk ayam coklat (brown layer).</span></div>
              <div><b>450–650 cm²/ekor</b><span>Kepadatan kandang baterai yang direkomendasikan.</span></div>
              <div><b>14–16 jam cahaya</b><span>Program pencahayaan optimal pada masa produksi.</span></div>
              <div><b>&lt;12% (fase layer)</b><span>Ambang mortalitas kumulatif fase produksi; target komersial idealnya lebih rendah.</span></div>
            </div>
            <p className="layer-source">Acuan: MSD Veterinary Manual, panduan strain ISA Brown, Lohmann, Hy-Line, dan literatur peternakan. Nilai bervariasi menurut strain dan kondisi lapangan.</p>
          </section>
          <section className="layer-card">
            <h3>Cara menggunakan dashboard</h3>
            <ol className="layer-instructions">
              <li><b>Produksi & Pakan</b> — masukkan data populasi, umur, produksi telur harian, dan konsumsi pakan.</li>
              <li><b>Kondisi Kandang</b> — masukkan suhu, kelembapan, kepadatan, pencahayaan, dan amonia.</li>
              <li><b>Vaksinasi & Kesehatan</b> — tandai status vaksin sesuai umur flok dan masukkan data mortalitas.</li>
              <li><b>Skor KPI Komposit</b> — tinjau skor 0–100 dan status Sangat Baik / Baik / Perlu Perhatian / Kritis.</li>
            </ol>
          </section>
        </div>}

        {activeTab === "produksi" && <section className="layer-card" role="tabpanel">
          <h2>Produksi telur & konsumsi pakan</h2>
          <p className="layer-note">Dibandingkan terhadap kurva standar usia (indikatif — sesuaikan dengan panduan strain yang digunakan peternakan Anda).</p>
          <div className="layer-grid-2">
            <div>
              <InputGroup title="Data Flok">
                <ControlField label="Umur ayam (minggu)" value={inputs.age} min={16} max={90} setValue={updateInput("age")} />
                <ControlField label="Populasi ayam saat ini (ekor)" value={inputs.population} min={100} max={20000} step={50} format={formatInt} setValue={updateInput("population")} />
              </InputGroup>
              <InputGroup title="Produksi Telur">
                <ControlField label="Jumlah telur harian (butir)" value={inputs.eggs} min={0} max={20000} step={10} format={formatInt} setValue={updateInput("eggs")} />
                <ControlField label="Berat telur rata-rata (gram)" value={inputs.eggWeight} min={40} max={75} setValue={updateInput("eggWeight")} />
              </InputGroup>
              <InputGroup title="Pakan">
                <ControlField label="Konsumsi pakan (gram/ekor/hari)" value={inputs.feed} min={60} max={150} setValue={updateInput("feed")} />
              </InputGroup>
            </div>
            <div>
              <div className="layer-kpi-row">
                <Kpi label="Hen-Day Production (HDEP)" value={`${production.hdep.toFixed(1)}%`} tone={production.hdep >= production.hdepStandard ? "positive" : "warning"} />
                <Kpi label={`Standar usia ${Math.round(inputs.age)} minggu`} value={`${production.hdepStandard.toFixed(1)}%`} />
                <Kpi label="Egg mass" value={`${production.eggMass.toFixed(1)} g/ekor/hr`} />
                <Kpi label="FCR" value={production.fcr > 0 ? production.fcr.toFixed(2) : "—"} tone={production.fcr > 0 && production.fcr <= FCR_TARGET * 1.1 ? "positive" : "warning"} />
              </div>
              <div className="layer-chart-box"><LineChart age={inputs.age} actual={production.hdep} standard={hdepAgeCurve} /></div>
              <div className="layer-legend"><span><i className="actual" />HDEP aktual</span><span><i className="standard" />Standar usia (indikatif)</span></div>
            </div>
          </div>
        </section>}

        {activeTab === "kandang" && <section className="layer-card" role="tabpanel">
          <h2>Kondisi kandang & kesejahteraan</h2>
          <p className="layer-note">Setiap parameter dinilai terhadap rentang ideal untuk ayam layer dewasa. Skor menurun bila terlalu jauh dari rentang ideal.</p>
          <div className="layer-grid-2">
            <div>
              <InputGroup title="Lingkungan">
                <ControlField label="Suhu kandang rata-rata (°C)" value={inputs.temperature} min={14} max={38} setValue={updateInput("temperature")} />
                <ControlField label="Kelembapan (%)" value={inputs.humidity} min={30} max={90} setValue={updateInput("humidity")} />
                <ControlField label="Kadar amonia kandang (ppm)" value={inputs.ammonia} min={0} max={50} setValue={updateInput("ammonia")} />
              </InputGroup>
              <InputGroup title="Kepadatan & Pencahayaan">
                <ControlField label="Kepadatan kandang (cm²/ekor)" value={inputs.density} min={300} max={900} step={10} setValue={updateInput("density")} />
                <ControlField label="Lama pencahayaan (jam/hari)" value={inputs.light} min={8} max={20} setValue={updateInput("light")} />
              </InputGroup>
              <InputGroup title="Kebersihan">
                <ControlField label="Skor kebersihan & sanitasi kandang (1–5)" value={inputs.sanitation} min={1} max={5} setValue={updateInput("sanitation")} />
              </InputGroup>
            </div>
            <div>
              <div className="layer-kpi-row">
                <Kpi label="Skor kondisi kandang" value={`${Math.round(housing.score)}/100`} tone={housing.score >= 80 ? "positive" : housing.score < 60 ? "warning" : ""} />
                <Kpi label="Status amonia" value={inputs.ammonia <= 20 ? "Aman" : "Tinggi"} tone={inputs.ammonia <= 20 ? "positive" : "warning"} />
                <Kpi label="Status kepadatan" value={inputs.density >= 450 ? "Sesuai" : "Padat"} tone={inputs.density >= 450 ? "positive" : "warning"} />
                <Kpi label="Status suhu" value={inputs.temperature >= 18 && inputs.temperature <= 24 ? "Nyaman" : inputs.temperature > 24 ? "Panas" : "Dingin"} tone={inputs.temperature >= 18 && inputs.temperature <= 24 ? "positive" : "warning"} />
              </div>
              <div className="layer-chart-box"><BarChart
                labels={["Suhu", "Kelembapan", "Amonia", "Kepadatan", "Cahaya", "Sanitasi"]}
                values={[housing.temperatureScore, housing.humidityScore, housing.ammoniaScore, housing.densityScore, housing.lightScore, housing.sanitationScore]}
                colors={["#F5C400", "#415F9D", "#C95B55", "#233B6E", "#39734F", "#8A96AA"]}
              /></div>
              <p className="layer-note">Rentang ideal acuan: suhu 18–24°C, kelembapan 50–70%, amonia &lt;20 ppm, kepadatan 450–650 cm²/ekor, pencahayaan 14–16 jam/hari.</p>
            </div>
          </div>
        </section>}

        {activeTab === "vaksin" && <section className="layer-card" role="tabpanel">
          <h2>Kepatuhan vaksinasi & kesehatan flok</h2>
          <p className="layer-note">Jadwal bersifat indikatif (program umum layer di Indonesia). Sesuaikan dengan rekomendasi dokter hewan/dinas setempat, riwayat penyakit wilayah, dan produk vaksin yang tersedia.</p>
          <div className="layer-grid-2">
            <div>
              <InputGroup title="Data Kesehatan">
                <ControlField label="Populasi awal periode (ekor)" value={inputs.initialPopulation} min={100} max={20000} step={50} format={formatInt} setValue={updateInput("initialPopulation")} />
                <ControlField label="Mortalitas minggu ini (%)" value={inputs.weeklyMortality} min={0} max={2} step={0.01} format={(value) => value.toFixed(2)} setValue={updateInput("weeklyMortality")} />
              </InputGroup>
              <p className="layer-note">Populasi saat ini dan umur mengikuti input di tab <b>Produksi & Pakan</b>.</p>
              <InputGroup title="Jadwal Vaksinasi">
                <div className="layer-vax-list">
                  {VAX_SCHEDULE.map((vaccine, index) => {
                    const due = inputs.age * 7 >= vaccine.day;
                    const done = vaccinationStatus[index];
                    return <div className={`layer-vax-row ${due && !done ? "overdue" : ""}`} key={vaccine.name}>
                      <div><span>{vaccine.name}</span><small>Usia {vaxAge(vaccine.day)} minggu (hari ke-{vaccine.day}) · {vaccine.method}</small></div>
                      <button type="button" className={done ? "done" : ""} aria-pressed={done} onClick={() => toggleVaccination(index)}>{done ? "Sudah" : "Belum"}</button>
                    </div>;
                  })}
                </div>
              </InputGroup>
            </div>
            <div>
              <div className="layer-kpi-row">
                <Kpi label="Kepatuhan vaksin (jadwal jatuh tempo)" value={`${Math.round(health.compliance)}%`} tone={health.compliance >= 90 ? "positive" : "warning"} />
                <Kpi label="Livability" value={`${health.livability.toFixed(1)}%`} tone={health.livability >= 95 ? "positive" : "warning"} />
                <Kpi label="Mortalitas minggu ini" value={`${(health.mortality * 100).toFixed(2)}%`} tone={health.mortality <= 0.0015 ? "positive" : "warning"} />
                <Kpi label="Vaksin jatuh tempo belum selesai" value={health.dueVaccines.length - health.completedDue} />
              </div>
              <div className="layer-chart-box"><BarChart
                labels={["Kepatuhan vaksin", "Livability", "Mortalitas (skor)"]}
                values={[health.compliance, health.livabilityScore, health.mortalityScore]}
                colors={["#F5C400", "#39734F", "#C95B55"]}
              /></div>
            </div>
          </div>
        </section>}

        {activeTab === "skor" && <section className="layer-card" role="tabpanel">
          <div className={`layer-status-banner ${statusTone}`}>
            <div><span>Skor KPI Komposit Peternakan</span><strong>{Math.round(overall)} / 100</strong></div>
            <b>{status}</b>
          </div>
          <div className="layer-two-col">
            <div className="layer-chart-box layer-radar-box"><RadarChart labels={["Produksi", "Pakan/FCR", "Kandang", "Kesehatan", "Vaksinasi"]} values={[scores.produksi, scores.pakan, scores.kandang, scores.kesehatan, scores.vaksin]} /></div>
            <div className="layer-score-table-wrap">
              <table className="layer-score-table">
                <thead><tr><th>Dimensi KPI</th><th>Skor</th><th>Bobot</th><th>Status</th></tr></thead>
                <tbody>
                  {metricRows.map(([label, score, weight]) => <tr key={label}>
                    <td>{label}</td><td>{Math.round(score)}</td><td>{Math.round(weight * 100)}%</td>
                    <td><span className={`layer-pill ${pillTone(score)}`}>{score >= 80 ? "Baik" : score >= 60 ? "Perlu Perhatian" : "Kritis"}</span></td>
                  </tr>)}
                  <tr className="layer-score-total"><td>Skor Komposit</td><td colSpan="3">{Math.round(overall)} / 100 — {status}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <p className="layer-note">Bobot skor komposit: Produksi Telur 30%, Pakan/FCR 20%, Kondisi Kandang 15%, Kesehatan/Mortalitas 20%, Vaksinasi 15%. Skor ini adalah alat bantu pemantauan cepat, bukan pengganti audit teknis lapangan.</p>
        </section>}
      </main>

      <footer className="layer-disclaimer">Alat bantu pemantauan berbasis asumsi dan benchmark umum industri. Rentang standar mengacu MSD Veterinary Manual, panduan strain ayam layer komersial (ISA/Lohmann/Hy-Line), serta literatur peternakan terkait kandang dan kesehatan unggas. Kalibrasikan nilai target dengan panduan strain spesifik dan kondisi wilayah Anda sebelum digunakan untuk keputusan manajemen.</footer>
    </div>
  );
}
