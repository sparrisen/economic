import React, { useState, useEffect } from "react";
import styles from "./MacroDashboard.module.scss";
import { Search } from "lucide-react";
import axios from "axios";

const types = [
    "Commodities",   // Metals, Energy, Agriculture
    "Markets",       // Indices, Real Estate
    "Bonds & Rates", // Bonds, Rates, Inflation
    "FX",            // Valutor
    "Stocks",        // Aktier
    "Crypto"         // Krypto
  ];

export default function MacroDashboard() {
  const [timeRange, setTimeRange] = useState("change1D");
  const [filter, setFilter] = useState("");
  const [showPercent, setShowPercent] = useState(true);
  const [selectedType, setSelectedType] = useState("Commodity");
  const [macroData, setMacroData] = useState([]);

  // Normalisering efter hämtning
useEffect(() => {
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
  
        const normalizeType = (type) => {
          if (["Metals", "Energy", "Agriculture"].includes(type)) return "Commodities";
          if (["Indices", "Real Estate"].includes(type)) return "Markets";
          if (["Bond", "Rates", "Inflation"].includes(type)) return "Bonds & Rates";
          return type;
        };
  
        const normalizedData = rawData.map(item => ({
          ...item,
          rawType: item.type,
          type: normalizeType(item.type)
        }));
  
        setMacroData(normalizedData);
      } catch (err) {
        console.error("API fetch failed:", err);
      }
    };
  
    fetchData();
  }, []);
   

  if (macroData.length === 0) {
    return <div className={styles.loading}>Laddar makrodata...</div>;
  }
  

  const filteredData = macroData.filter(
    (item) =>
      item.type === selectedType &&
      item.name.toLowerCase().includes(filter.toLowerCase())
  );

    const grouped = {};
        filteredData.forEach(item => {
        const key = item.rawType || "Other";
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
    });

  const renderValue = (item) => {
    if (item.type === "Bond") {
      return `${item.value.toFixed(3)}%`;
    }
  
    if (item.type === "Metals") {
      return `$${item.value.toFixed(2)}`; // Exakt det du ville
    }
  
    if (item.value > 1000) return `$${item.value.toFixed(0)}`;
    if (item.value > 100) return `$${item.value.toFixed(2)}`;
    if (item.value > 1) return `$${item.value.toFixed(3)}`;
    return `$${item.value.toFixed(4)}`;
  };
  
  const timeframeToKey = {
    "1D": "change1D",
    "3D": "change3D",
    "1W": "change1W",
    "1M": "change1M",
    "YTD": "changeYTD",
    "1Y": "change1Y",
    "5Y": "change5Y"
  };  
  
  const renderChange = (item) => {
    const rawChange = Number(item[timeRange]);
    const rawPercent = Number(item[`${timeRange}Percent`]);
  
    if (rawChange == null || rawPercent == null) {
      return <span className={styles.statusStable}>—</span>;
    }
  
    const up = rawChange > 0;
    const down = rawChange < 0;
    const sign = up ? "+" : down ? "−" : "";
  
    const className = up
      ? styles.statusUp
      : down
      ? styles.statusDown
      : styles.statusStable;
  
    return (
      <span className={className}>
        {showPercent
          ? `${sign}${Math.abs(rawPercent).toFixed(2)}%`
          : `${sign}$${Math.abs(rawChange).toFixed(2)}`
        }
      </span>
    );
  };
  
   
  
  return (
    <div className={styles.dashboard}>
      <div className={styles.tabs}>
        {types.map((type) => (
            <button
            key={type}
            className={
                selectedType === type
                ? styles.activeTab
                : styles.inactiveTab
            }
            onClick={() => setSelectedType(type)}
            >
            {type}
            </button>
        ))}
        </div>


      <div className={styles.header}>
        <div className={styles.rangeButtons}>
            {["change1D", "change3D", "change1W", "change1M", "changeYTD", "change1Y", "change5Y"].map(range => (
                <button
                key={range}
                className={timeRange === range ? styles.activeTab : styles.inactiveTab}
                onClick={() => setTimeRange(range)}
                >
                {range.replace("change", "")}
                </button>
            ))}
        </div>


        <div className={styles.searchBar}>
          <div className={styles.searchWrapper}>
            <Search className={styles.icon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <button
            className={`${styles.toggleButton} ${
                showPercent ? styles.percentActive : styles.dollarActive
            }`}
            onClick={() => setShowPercent((prev) => !prev)}
            >
            {showPercent ? "Showing %" : "Showing $"}
        </button>

        </div>
      </div>
      {Object.entries(grouped).map(([group, items]) => (
        <div key={group} className={styles.tableCard}>
            <h2 className={styles.subHeader}>{group}</h2>

            {/* METALS */}
            {group === "Metals" && (
            <table className={styles.table}>
                <thead>
                <tr>
                    <th>Asset</th>
                    <th>Last Price</th>
                    <th>Change</th>
                    <th>Time</th>
                </tr>
                </thead>
                <tbody>
                {items.map((item, index) => (
                    <tr key={index}>
                    <td>{item.name}</td>
                    <td>${item.value.toFixed(2)}</td>
                    <td>{renderChange(item, false)}</td>
                    <td>{item.time || "N/A"}</td>
                    </tr>
                ))}
                </tbody>
            </table>
            )}

            {/* ENERGY */}
            {group === "Energy" && (
            <table className={styles.table}>
                <thead>
                <tr>
                    <th>Asset</th>
                    <th>Last Price</th>
                    <th>Change</th>
                    <th>% Change</th>
                    <th>Time</th>
                </tr>
                </thead>
                <tbody>
                {items.map((item, index) => (
                    <tr key={index}>
                    <td>{item.name}</td>
                    <td>${item.value.toFixed(2)}</td>
                    <td>{renderChange(item, false)}</td>
                    <td>{renderChange(item, true)}</td>
                    <td>{item.time || "N/A"}</td>
                    </tr>
                ))}
                </tbody>
            </table>
            )}

            {/* BONDS */}
            {(group === "Bond" || group === "Rates" || group === "Bonds & Rates") && (
            <table className={styles.table}>
                <thead>
                <tr>
                    <th>Bond</th>
                    <th>Yield</th>
                    <th>Change</th>
                    <th>Time</th>
                </tr>
                </thead>
                <tbody>
                {items.map((item, index) => (
                    <tr key={index}>
                    <td>{item.name}</td>
                    <td>{item.value.toFixed(3)}%</td>
                    <td>{renderChange(item, false)}</td>
                    <td>{item.time || "N/A"}</td>
                    </tr>
                ))}
                </tbody>
            </table>
            )}

            {/* FX */}
            {group === "FX" && (
            <table className={styles.table}>
                <thead>
                <tr>
                    <th>Currency Pair</th>
                    <th>Exchange Rate</th>
                    <th>Change</th>
                    <th>% Change</th>
                    <th>Time</th>
                </tr>
                </thead>
                <tbody>
                {items.map((item, index) => (
                    <tr key={index}>
                    <td>{item.name}</td>
                    <td>{item.value.toFixed(4)}</td>
                    <td>{renderChange(item, false)}</td>
                    <td>{renderChange(item, true)}</td>
                    <td>{item.time || "N/A"}</td>
                    </tr>
                ))}
                </tbody>
            </table>
            )}

            {/* AGRICULTURE */}
            {group === "Agriculture" && (
            <table className={styles.table}>
                <thead>
                <tr>
                    <th>Asset</th>
                    <th>Last Price</th>
                    <th>Change</th>
                    <th>% Change</th>
                    <th>Time</th>
                </tr>
                </thead>
                <tbody>
                {items.map((item, index) => (
                    <tr key={index}>
                    <td>{item.name}</td>
                    <td>${item.value.toFixed(2)}</td>
                    <td>{renderChange(item, false)}</td>
                    <td>{renderChange(item, true)}</td>
                    <td>{item.time || "N/A"}</td>
                    </tr>
                ))}
                </tbody>
            </table>
            )}

            {/* MARKETS */}
            {group === "Markets" && (
            <table className={styles.table}>
                <thead>
                <tr>
                    <th>Index</th>
                    <th>Last Level</th>
                    <th>Change</th>
                    <th>% Change</th>
                    <th>Time</th>
                </tr>
                </thead>
                <tbody>
                {items.map((item, index) => (
                    <tr key={index}>
                    <td>{item.name}</td>
                    <td>{item.value.toLocaleString()}</td>
                    <td>{renderChange(item, false)}</td>
                    <td>{renderChange(item, true)}</td>
                    <td>{item.time || "N/A"}</td>
                    </tr>
                ))}
                </tbody>
            </table>
            )}
        </div>
        ))}


    </div>
  );
}
