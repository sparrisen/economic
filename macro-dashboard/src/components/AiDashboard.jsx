import React, { useState, useEffect } from "react";
import styles from "./MacroDashboard.module.scss";
import axios from "axios";
import { Upload, Download } from "lucide-react";

export default function AiDashboard({ onBack, macroData: externalData }) {
  const [macroData, setMacroData] = useState(externalData || []);
  const [selectedFile, setSelectedFile] = useState(null);

  // Fetch macro data if not provided from parent, reusing MacroDashboard endpoints
  useEffect(() => {
    if (!externalData) {
      const fetchData = async () => {
        try {
          const [commoditiesRes, bondsRes, usdEurRes] = await Promise.all([
            axios.get("http://localhost:5000/api/commodities"),
            axios.get("http://localhost:5000/api/bonds"),
            axios.get("http://localhost:5000/api/usd-eur"),
          ]);
          const rawData = [
            ...commoditiesRes.data,
            usdEurRes.data,
            {
              name: "BTC/USD",
              value: 64000,
              changePercent: -2.5,
              changeValue: -1600,
              type: "Crypto",
              spotPrice: false,
            },
            ...bondsRes.data,
          ];
          // Normalize types to match MacroDashboard categories:contentReference[oaicite:10]{index=10}
          const normalizeType = (type) => {
            if (["Metals", "Energy", "Agriculture"].includes(type)) return "Commodities";
            if (["Indices", "Real Estate"].includes(type)) return "Markets";
            if (["Bond", "Rates", "Inflation"].includes(type)) return "Bonds & Rates";
            return type;
          };
          const normalizedData = rawData.map(item => ({
            ...item,
            rawType: item.type,
            type: normalizeType(item.type),
          }));
          setMacroData(normalizedData);
        } catch (err) {
          console.error("API fetch failed:", err);
        }
      };
      fetchData();
    }
  }, [externalData]);

  // Prepare and trigger file download for the AI-generated report
  const downloadReport = () => {
    const goldItem = macroData.find(item => item.name && item.name.toLowerCase().includes("gold"));
    const tenYItem = macroData.find(item => {
      const name = item.name ? item.name.toLowerCase() : "";
      return name.includes("10y") || name.includes("10-year") || name.includes("10 year");
    });
    const report = {
      economist: "George Gammon",
      worldview: "Libertarian/Austrian-influenced; skeptical of central planning and pro free-market.",
      recentViewpoint: "Predicted inevitable UBI within 3 years (as of mid-2023), viewing policies like government-funded baby accounts as steps toward a centralized digital currency.",
      currentData: {
        goldPrice: goldItem ? `$${goldItem.value}` : "N/A",
        tenYearYield: tenYItem ? `${tenYItem.value}%` : "N/A",
      },
      interpretation: "Gammon might argue that rising gold prices and current bond yields signal market fears about inflation and excessive government intervention.",
    };
    // Create a blob and trigger browser download as JSON
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "economist_report.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Identify key macro items for display (gold price and 10-year yield)
  const goldItem = macroData.find(item => item.name && item.name.toLowerCase().includes("gold"));
  const tenYItem = macroData.find(item => {
    const name = item.name ? item.name.toLowerCase() : "";
    return name.includes("10y") || name.includes("10-year") || name.includes("10 year");
  });

  return (
    <div className={styles.dashboard}>
      {/* Toggle buttons to switch between Macro and AI dashboards */}
      <div className={styles.tabs}>
        {onBack && (
          <button className={styles.inactiveTab} onClick={onBack}>
            Macro Dashboard
          </button>
        )}
        <button className={styles.activeTab} disabled>
          AI Dashboard
        </button>
      </div>

      {/* Economist Profile Section */}
      <div className={styles.tableCard}>
        <h2 className={styles.subHeader}>Economist Profile: George Gammon</h2>
        <p><strong>Worldview:</strong> George Gammon approaches economics from a free-market, libertarian perspective with Austrian economics roots. He champions sound money and limited government intervention, remaining skeptical of central planners’ ability to control the economy.</p>
        <p><strong>Latest Viewpoints:</strong> Gammon consistently highlights unintended consequences of policies. In mid-2023, he warned that the U.S. would implement UBI within three years—even under a populist like Trump—if unemployment soared. He points to policies like government-funded accounts for newborns as confirming his UBI prediction and cautions that such steps could pave the way for a central bank digital currency.</p>
      </div>

      {/* AI-Enhanced Report Section: Upload and Download */}
      <div className={styles.tableCard}>
        <h2 className={styles.subHeader}>AI-Enhanced Report</h2>
        <div className={styles.tabs}>
          {/* File Upload (hidden native input with styled label) */}
          <input 
            type="file" 
            id="fileInput" 
            style={{ display: "none" }} 
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                setSelectedFile(e.target.files[0]);
              }
            }} 
          />
          <label htmlFor="fileInput" className={styles.inactiveTab}>
            <Upload className={styles.icon} /> Upload Document
          </label>
          {/* Download Report Button */}
          <button className={styles.inactiveTab} onClick={downloadReport}>
            <Download className={styles.icon} /> Download Report
          </button>
        </div>
        {selectedFile && (
          <p><em>Loaded file:</em> {selectedFile.name}</p>
        )}
        {/* Display current macro snapshot and interpretation */}
        {goldItem && tenYItem ? (
          <p>
            Current Gold Price: <strong>${goldItem.value.toFixed(2)}</strong>, 
            10-Year Treasury Yield: <strong>{tenYItem.value.toFixed(2)}%</strong>.{" "}
            <em>Interpretation:</em> These indicators suggest, in line with Gammon’s views, 
            growing market concerns about inflation and government policies.
          </p>
        ) : (
          <p><em>Loading current macro data...</em></p>
        )}
      </div>
    </div>
  );
}
