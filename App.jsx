import { useEffect, useState } from "react";
import RiskMap from "./RiskMap";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  // =====================================================
  // STATE
  // =====================================================
  const [apiOnline, setApiOnline] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [predictionError, setPredictionError] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dashboardRefreshTime, setDashboardRefreshTime] = useState(null);

  const [selectedAlert, setSelectedAlert] = useState(null);

  const [alerts, setAlerts] = useState([]);
  const [alertFilter, setAlertFilter] = useState("ALL");
  const [alertsLoading, setAlertsLoading] = useState(true);

  const [hotspots, setHotspots] = useState([]);
  const [hotspotsLoading, setHotspotsLoading] = useState(true);

  const [riskFilter, setRiskFilter] = useState("ALL");
  const [locationFilter, setLocationFilter] = useState("ALL");
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [timeFilter, setTimeFilter] = useState("ALL");
  const [searchLocation, setSearchLocation] = useState("");
const [sortBy, setSortBy] = useState("RISK_SCORE");
  const [predictionTime, setPredictionTime] = useState(null);
  
  const dashboardLoading = alertsLoading || hotspotsLoading;  

  const [form, setForm] = useState({
    complaints: 42,
    fraud_amount: 820000,
    suspicious_withdrawals: 31,
    hour: 20,
  });
  const checkApiStatus = async () => {
    try {
      const response = await fetch(
        `${API_URL}/health`
      );

      setApiOnline(response.ok);
    }  catch (error) {
      console.error(
        "API health check failed:",
        error
      );

      setApiOnline(false);
    }
  };
  useEffect(() => {
    checkApiStatus();

    const interval = setInterval(() => {
      checkApiStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    const clock = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(clock);
  }, []);

  // =====================================================
  // FETCH ALERTS
  // =====================================================

  const fetchAlerts = async () => {
    try {
      setAlertsLoading(true);

      const response = await fetch(`${API_URL}/alerts`);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch alerts: ${response.status}`
        );
      }

      const data = await response.json();

      console.log("Alerts received:", data);

      setAlerts(Array.isArray(data) ? data : []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Alert error:", error);
      setAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  };
  useEffect(() => {
    fetchAlerts();

    const interval = setInterval(() => {
      fetchAlerts();
    }, 10000);

    return () => clearInterval(interval);
  }, []);
  // =====================================================
  // FETCH HOTSPOTS
  // =====================================================

  const fetchHotspots = async () => {
    try {
      setHotspotsLoading(true);

      const response = await fetch(`${API_URL}/hotspots`);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch hotspots: ${response.status}`
        );
      }

      const data = await response.json();

      console.log("Hotspots received:", data);

      setHotspots(Array.isArray(data) ? data : []);
      setLastUpdated(new Date());
      setDashboardRefreshTime(new Date());
    } catch (error) {
      console.error("Hotspot error:", error);
      setHotspots([]);
    } finally {
      setHotspotsLoading(false);
    }
  };
  useEffect(() => {
    fetchHotspots();
  }, []);
  const refreshDashboard = async () => {
    if (refreshing) {
      return;
    }
    try {
    setRefreshing(true);
    await Promise.all([
      fetchAlerts(),
      fetchHotspots(),
    ]);
    setLastUpdated(new Date());
  } catch (error) {
    console.error(
      "Dashboard refresh error:",
      error
    );
  } finally {
    setRefreshing(false);
  }
  };
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/`);

        setApiOnline(response.ok);
      } catch (error) {
        console.error("API status check failed:", error);
        setApiOnline(false);
      }
    };

    checkApiStatus();

    const interval = setInterval(() => {
      checkApiStatus();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // =====================================================
  // INITIAL ALERT LOADING + AUTO REFRESH
  // =====================================================

  useEffect(() => {
    fetchAlerts().then(()=> {
      settLastUpdated(new Date());
    });


    const interval = setInterval(() => {
      fetchAlerts();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // =====================================================
  // INITIAL HOTSPOT LOADING + AUTO REFRESH
  // =====================================================

  useEffect(() => {
    fetchHotspots();

    const interval = setInterval(() => {
      fetchHotspots();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // =====================================================
  // FORM CHANGE
  // =====================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  // =====================================================
  // PREDICT RISK
  // =====================================================

  const predictRisk = async () => {
    const complaints = Number(form.complaints);
    const fraudAmount = Number(form.fraud_amount);
    const suspiciousWithdrawals = Number(
      form.suspicious_withdrawals
    );
    const hour = Number(form.hour);

    if (
      !Number.isFinite(complaints) ||
      complaints < 0
    ) {
      setPredictionError(
        "Complaints must be a valid number greater than or equal to 0."
      );
      return;
    }

    if (
      !Number.isFinite(fraudAmount) ||
      fraudAmount < 0
    ) {
      setPredictionError(
        "Fraud amount must be a valid number greater than or equal to 0."
      );
      return;
    }

    if (
      !Number.isFinite(suspiciousWithdrawals) ||
      suspiciousWithdrawals < 0
    ) {
      setPredictionError(
        "Suspicious withdrawals must be a valid number greater than or equal to 0."
      );
      return;
    }

    if (
      !Number.isFinite(hour) ||
      hour < 0 ||
      hour > 23
    ) {
      setPredictionError(
        "Hour must be between 0 and 23."
      );
      return;
    }

    setPredictionError("");
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(
        `${API_URL}/predict-risk`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            complaints,
            fraud_amount: fraudAmount,
            suspicious_withdrawals: suspiciousWithdrawals,
            hour,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Risk prediction failed: ${response.status}`
        );
      }

      const data = await response.json();

      console.log("Risk prediction:", data);
      
      setResult(data);
      setPredictionTime(new Date());

      // Refresh alerts after prediction
      await fetchAlerts();
    } catch (error) {
      console.error("Prediction error:", error);

      setPredictionError(
        "Unable to connect to the prediction server. Please make sure the FastAPI backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // UPDATE ALERT STATUS
  // =====================================================

  const updateAlertStatus = async (
    alertId,
    newStatus
  ) => {
    try {
      const response = await fetch(
        `${API_URL}/alerts/${alertId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to update alert: ${response.status}`
        );
      }

      setAlerts((currentAlerts) =>
        currentAlerts.map((currentAlert) =>
          currentAlert.alert_id === alertId
            ? {
                ...currentAlert,
                status: newStatus,
              }
            : currentAlert
        )
      );

      // Update selected alert if it is open
      setSelectedAlert((currentAlert) => {
        if (
          currentAlert &&
          currentAlert.alert_id === alertId
        ) {
          return {
            ...currentAlert,
            status: newStatus,
          };
        }

        return currentAlert;
      });
    } catch (error) {
      console.error(
        "Status update error:",
        error
      );

      alert(
        "Could not update alert status."
      );
    }
  };

  // =====================================================
  // RISK COLORS
  // =====================================================

  const riskColors = {
    HIGH: "#e34d5f",
    MEDIUM: "#e0ae3d",
    LOW: "#38d996",
  };

  // =====================================================
  // CALCULATE RISK SCORE
  // =====================================================

  const calculateRiskScore = (spot) => {
    const complaintScore = Math.min(
      (Number(spot.complaints) / 50) * 35,
      35
    );

    const fraudScore = Math.min(
      (Number(spot.fraud_amount) / 1000000) * 40,
      40
    );

    const withdrawalScore = Math.min(
      (Number(spot.suspicious_withdrawals) / 40) * 25,
      25
    );

    return Math.round(
      complaintScore +
        fraudScore +
        withdrawalScore
    );
  };

  // =====================================================
  // FILTER HOTSPOTS
  // =====================================================

  const filteredHotspots = hotspots
    .map((spot) => ({
      ...spot,
      riskScore: calculateRiskScore(spot),
    }))
    .filter((spot) => {
      const normalizedRisk = String(
        spot.risk || ""
      ).toUpperCase();

      const riskMatches =
        riskFilter === "ALL" ||
        normalizedRisk === riskFilter;

      const locationMatches =
        locationFilter === "ALL" ||
        spot.location === locationFilter;

      const searchMatches =
        spot.location
          ?.toLowerCase()
          .includes(searchLocation.toLowerCase());

      const hour = Number(spot.hour);

      let timeMatches = true;

      if (timeFilter === "MORNING")
        timeMatches = hour >= 6 && hour < 12;

      if (timeFilter === "AFTERNOON")
        timeMatches = hour >= 12 && hour < 17;

      if (timeFilter === "EVENING")
        timeMatches = hour >= 17 && hour < 21;

      if (timeFilter === "NIGHT")
        timeMatches = hour >= 21 || hour < 6;

      return (
        riskMatches &&
        locationMatches &&
        searchMatches &&
        timeMatches
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "RISK_SCORE":
          return b.riskScore - a.riskScore;

        case "FRAUD_AMOUNT":
          return (
            Number(b.fraud_amount) -
            Number(a.fraud_amount)
          );

        case "COMPLAINTS":
          return (
            Number(b.complaints) -
            Number(a.complaints)
          );

        case "LOCATION":
          return a.location.localeCompare(
            b.location
          );

        default:
          return 0;
      }
    });
    const clearHotspotFilters = () => {
      setSearchLocation("");
      setSortBy("RISK_SCORE");
      setRiskFilter("ALL");
      setLocationFilter("ALL");
      setTimeFilter("ALL");
    };

  // =====================================================
  // FILTER ALERTS
  // =====================================================

  const filteredAlerts =
    alertFilter === "ALL"
      ? alerts
      : alerts.filter((alert) => {
          const status = String(
            alert.status || "NEW"
          ).toUpperCase();
          return status === alertFilter;
        });

  // =====================================================
  // RISK STATISTICS
  // =====================================================

  const highCount = hotspots.filter(
    (spot) =>
      String(spot.risk || "")
        .toUpperCase() === "HIGH"
  ).length;

  const mediumCount = hotspots.filter(
    (spot) =>
      String(spot.risk || "")
        .toUpperCase() === "MEDIUM"
  ).length;

  const lowCount = hotspots.filter(
    (spot) =>
      String(spot.risk || "")
        .toUpperCase() === "LOW"
  ).length;


  const monitoredLocations = new Set(
    hotspots
      .map((spot) => spot.location)
      .filter(Boolean)
  ).size;

  const riskChartData = [
    {
      name: "HIGH",
      count: highCount,
    },
    {
      name: "MEDIUM",
      count: mediumCount,
    },
    {
      name: "LOW",
      count: lowCount,
    },
  ];
  const safeRiskScore = Math.min(
    Math.max(
      Number(result?.risk_score) || 0,
      0
    ),
    100
  );
  const safeRiskLevel =
    ["HIGH", "MEDIUM", "LOW"].includes(
      String(result?.risk_level || "").toUpperCase()
    )
      ? String(result.risk_level).toUpperCase()
      : "UNKNOWN";
  const safeProbability = (value) => {
    const number = Number(value);

      if (!Number.isFinite(number)) {
        return 0;
      }

      return Math.min(
        Math.max(Math.round(number), 0),
        100
      );
  };
  const activeAlertCount = alerts.filter((alert) => {
    const status = String(
      alert.status || "NEW"
    ).toUpperCase();

    return status !== "RESOLVED";
  }).length;


  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="app">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="header">

        <div>

          <p className="eyebrow">
            NATIONAL CYBERCRIME INTELLIGENCE
          </p>

          <h1>
            Cybercrime Hotspot
          </h1>

          <p className="subtitle">
            Predictive analytics for proactive
            financial cybercrime response
          </p>

        </div>
        <div className="header-actions">

          <button
            className="refresh-button"
            onClick={refreshDashboard}
            disabled={alertsLoading || alertsLoading || hotspotsLoading}
          >
            {refreshing
              ? "REFRESHING..."
              : "↻ REFRESH DATA"}
          </button>

          <div className="status">

            <span 
              className={`status-dot ${
                apiOnline ? "online" : "offline"
              }`}  
            >

            </span>

            {apiOnline ? "API ONLINE" : "API OFFLINE"}
              
          </div>
          {lastUpdated && (
            <span className="last-updated">
              Updated("")
               {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="system-time">
          <span className="system-time-label">
            SYSTEM TIME
          </span>

          <strong>
            {currentTime.toLocaleTimeString()}
          </strong>
        </div>
      </header>

      <main className="dashboard">
        {!apiOnline && (
          <div className="api-warning">
            <strong>Backend unavailable</strong>
            <span>
              Start the FastAPI server to load live
              cybercrime intelligence.
            </span>
          </div>
        )}

        {/* =================================================
            STATISTICS
        ================================================= */}

        <section className="stats">

          <div className="card">

            <span>
              ACTIVE ALERTS
            </span>

            <strong>
              {String(activeAlertCount).padStart(2, "0")}
            </strong>

            <small>
              Currently requiring attention
            </small>

          </div>

          <div className="card">

            <span>
              HIGH-RISK ZONES
            </span>

            <strong>
              {highCount}
            </strong>

            <small>
              Requires immediate attention
            </small>

          </div>

          <div className="card">

            <span>
              MONITORED LOCATIONS
            </span>

            <strong>
              {monitoredLocations}
            </strong>

            <small>
              Locations under monitoring
            </small>

          </div>

          <div className="card">

            <span>
              MODEL STATUS
            </span>

            <strong>
              LIVE
            </strong>

            <small>
              Random Forest
            </small>

          </div>

        </section>

        {/* =================================================
            MAIN CONTENT
        ================================================= */}

        <section className="content-grid">

          {/* =================================================
              AI PREDICTION
          ================================================= */}

          <div className="panel">

            <div className="panel-title">

              <div>

                <p className="eyebrow">
                  AI PREDICTION
                </p>

                <h2>
                  Risk Analysis
                </h2>

              </div>

            </div>

            <div className="form-grid">

              <label>

                Complaints

                <input
                  type="number"
                  name="complaints"
                  value={form.complaints}
                  onChange={handleChange}
                />

              </label>

              <label>

                Fraud Amount (₹)

                <input
                  type="number"
                  name="fraud_amount"
                  value={form.fraud_amount}
                  onChange={handleChange}
                />

              </label>

              <label>

                Suspicious Withdrawals

                <input
                  type="number"
                  name="suspicious_withdrawals"
                  value={
                    form.suspicious_withdrawals
                  }
                  onChange={handleChange}
                />

              </label>

              <label>

                Hour (0–23)

                <input
                  type="number"
                  min="0"
                  max="23"
                  name="hour"
                  value={form.hour}
                  onChange={handleChange}
                />

              </label>

            </div>

            <button
              className={`analyze-button ${
                loading ? "analyzing" : ""
              }`}
              onClick={predictRisk}
              disabled={loading}
            >

              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  ANALYZING...  
                </>
              ) : (
                "ANALYZE RISK"
              )}
            </button>
            {predictionError && (
              <div className="prediction-error">
                <strong>Analysis failed</strong>
                <span>{predictionError}</span>
              </div>
            )}

            {/* =================================================
                RISK RESULT
            ================================================= */}

            {result && (

              <div className="risk-result-card">

                <h2>
                  Risk Analysis Result
                </h2>
                {predictionTime && (
                  <small className="prediction-time">
                    Analyzed at{" "}
                    {predictionTime.toLocaleTimeString()}
                  </small>
                )}
                <div className="risk-level">

                  {safeRiskLevel}

                </div>

                <div className="risk-score">

                  <span>
                    Risk Score
                  </span>

                  <div className="score-number">

                    <strong>
                      {safeRiskScore}
                    </strong>

                    <small>
                      / 100
                    </small>

                  </div>

                  <div className="score-bar">

                    <div
                      className={`score-fill ${
                        safeRiskLevel.toLowerCase()
                      }`}
                      style={{
                        width: `${safeRiskScore}%`,
                      }}
                    ></div>

                  </div>

                  <div className="score-label">

                    {safeRiskLevel} RISK
                    

                  </div>

                </div>

                {/* =================================================
                    RISK FACTORS
                ================================================= */}

                <div className="risk-reasons">

                  <h3>
                    Risk Factors
                  </h3>

                  {Number(
                    form.complaints
                  ) >= 30 && (

                    <div className="risk-factor">

                      <span>
                        ⚠️
                      </span>

                      <p>
                        High number of
                        cybercrime complaints
                      </p>

                    </div>

                  )}

                  {Number(
                    form.fraud_amount
                  ) >= 500000 && (

                    <div className="risk-factor">

                      <span>
                        💰
                      </span>

                      <p>
                        High reported fraud
                        amount
                      </p>

                    </div>

                  )}

                  {Number(
                    form.suspicious_withdrawals
                  ) >= 20 && (

                    <div className="risk-factor">

                      <span>
                        🏦
                      </span>

                      <p>
                        High suspicious
                        withdrawal activity
                      </p>

                    </div>

                  )}

                  {Number(form.hour) >= 20 && (

                    <div className="risk-factor">

                      <span>
                        🌙
                      </span>

                      <p>
                        Activity detected during
                        a high-risk time period
                      </p>

                    </div>

                  )}
                  {Number(form.complaints) < 30 &&
                  Number(form.fraud_amount) < 500000 &&
                  Number(form.suspicious_withdrawals) < 20 &&
                  Number(form.hour) < 20 && (
                    <div className="no-risk-factors">
                      <span>✓</span>
                      <p>
                        No significant risk factors detected.
                      </p>
                    </div> 
                  )}
                </div>

                {/* =================================================
                    PROBABILITIES
                ================================================= */}

                <div className="probabilities">

                  <div>

                    <span>
                      HIGH
                    </span>

                    <strong>
                      {safeProbability(
                        result.probabilities?.HIGH
                      )}%
                    </strong>

                  </div>

                  <div>

                    <span>
                      MEDIUM
                    </span>

                    <strong>
                      {safeProbability(
                        result.probabilities?.MEDIUM
                      )}%
                    </strong>

                  </div>

                  <div>

                    <span>
                      LOW
                    </span>

                    <strong>
                      {safeProbability(
                        result.probabilities?.LOW
                      )}%
                    </strong>

                  </div>

                </div>

              </div>

            )}

          </div>

          {/* =================================================
              GIS MAP
          ================================================= */}

          <div className="panel map-panel">

            <div className="panel-title">

              <div>

                <p className="eyebrow">
                  GIS INTELLIGENCE
                </p>

                <h2>
                  Risk Heatmap
                </h2>

                <div className="hotspot-filter-count">
                  Showing{" "}
                  <strong>{filteredHotspots.length}</strong>{" "}
                  of{" "}
                  <strong>{hotspots.length}</strong>{" "}
                    hotspots
                </div>

                <div className="filters">

                  {/* LOCATION */}

                  <select
                    value={locationFilter}
                    onChange={(e) =>
                      setLocationFilter(
                        e.target.value
                      )
                    }
                  >

                    <option value="ALL">
                      All Locations
                    </option>

                    {[
                      ...new Set(
                        hotspots
                          .map(
                            (spot) =>
                              spot.location
                          )
                          .filter(Boolean)
                      ),
                    ].map((location) => (

                      <option
                        key={location}
                        value={location}
                      >
                        {location}
                      </option>

                    ))}

                  </select>

                  {/* RISK */}

                  <select
                    value={riskFilter}
                    onChange={(e) =>
                      setRiskFilter(
                        e.target.value
                      )
                    }
                  >

                    <option value="ALL">
                      All Risk Levels
                    </option>

                    <option value="HIGH">
                      High Risk
                    </option>

                    <option value="MEDIUM">
                      Medium Risk
                    </option>

                    <option value="LOW">
                      Low Risk
                    </option>

                  </select>

                  {/* TIME */}

                  <select
                    value={timeFilter}
                    onChange={(e) =>
                      setTimeFilter(
                        e.target.value
                      )
                    }
                  >

                    <option value="ALL">
                      All Time
                    </option>

                    <option value="MORNING">
                      Morning
                    </option>

                    <option value="AFTERNOON">
                      Afternoon
                    </option>

                    <option value="EVENING">
                      Evening
                    </option>

                    <option value="NIGHT">
                      Night
                    </option>

                  </select>
                  <button
                    className="clear-filters-button"
                    onClick={clearHotspotFilters}
                  >
                    Clear Filters
                  </button>

                </div>
                <input
                  type="text"
                  placeholder="Search location..."
                  value={searchLocation}
                  onChange={(e) =>
                    setSearchLocation(e.target.value)
                  }              
                />

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="RISK_SCORE">
                    Highest Risk Score
                  </option>

                  <option value="FRAUD_AMOUNT">
                    Highest Fraud Amount
                  </option>

                  <option value="COMPLAINTS">
                    Most Complaints
                  </option>

                  <option value="LOCATION">
                    Location (A–Z)
                  </option>
                </select>

              </div>

            </div>

            <div className="real-map">

              <MapContainer
                center={[11.2, 78.5]}
                zoom={6}
                scrollWheelZoom={true}
                style={{
                  height: "400px",
                  width: "100%",
                }}
              >

                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {filteredHotspots.map(
                  (spot, index) => {

                    const latitude =
                      Number(
                        spot.latitude
                      );

                    const longitude =
                      Number(
                        spot.longitude
                      );

                    if (
                      !Number.isFinite(
                        latitude
                      ) ||
                      !Number.isFinite(
                        longitude
                      )
                    ) {
                      return null;
                    }

                    const normalizedRisk =
                      String(
                        spot.risk || "LOW"
                      ).toUpperCase();

                    const markerColor =
                      riskColors[
                        normalizedRisk
                      ] || riskColors.LOW;

                    return (

                      <CircleMarker
                        key={`${spot.location}-${index}`}
                        center={[
                          latitude,
                          longitude,
                        ]}
                        radius={Math.max(
                          8,
                          spot.riskScore / 4
                        )}
                        pathOptions={{
                          color:
                            markerColor,
                          fillColor:
                            markerColor,
                          fillOpacity: 0.75,
                          weight: 3,
                        }}
                      >

                        <Popup>

                          <strong>
                            {spot.location}
                          </strong>

                          <br />

                          Risk Level:{" "}
                          {normalizedRisk}

                          <br />

                          Risk Score:{" "}
                          {spot.riskScore}/100

                          <br />

                          Complaints:{" "}
                          {spot.complaints}

                          <br />

                          Fraud Amount: ₹
                          {Number(
                            spot.fraud_amount
                          ).toLocaleString(
                            "en-IN"
                          )}

                          <br />

                          Suspicious Withdrawals:{" "}
                          {
                            spot.suspicious_withdrawals
                          }

                          <br />

                          Hour:{" "}
                          {spot.hour}:00

                        </Popup>

                      </CircleMarker>

                    );
                  }
                )}

              </MapContainer>

            </div>

            {/* MAP LEGEND */}

            <div className="legend">

              <span>

                <i className="dot high"></i>

                High

              </span>

              <span>

                <i className="dot medium"></i>

                Medium

              </span>

              <span>

                <i className="dot low"></i>

                Low

              </span>

            </div>

          </div>

        </section>

        {/* =================================================
            HOTSPOTS
        ================================================= */}

        <section className="hotspots-section">

          <div className="section-header">

            <h2>
              Cybercrime Hotspots
            </h2>
            {dashboardRefreshTime && (
              <small className="dashboard-refresh-time">
                Last refresh:{" "}
                {dashboardRefreshTime.toLocaleTimeString()}
              </small>
            )}

            <span>
              Live Data
            </span>

          </div>
          <button
            className="refresh-hotspots-button"
            onClick={fetchHotspots}
            disabled={hotspotsLoading}
          >
            {hotspotsLoading
              ? "Refreshing..."
              : "↻ Refresh Hotspots"}
            </button>

          {hotspotsLoading ? (

            <p className="loading-text">
              Loading hotspots...
            </p>

          ) : hotspots.length === 0 ? (

            <p className="loading-text">
              No hotspot data available.
            </p>
          ) : filteredHotspots.length === 0 ? (
            <div className="hotspot-empty-state">
              <span>⌕</span>

              <h3>
                No matching hotspots
              </h3>

              <p>
                Try changing your search or filters.
              </p>

              <button
                className="clear-filters-button"
                onClick={clearHotspotFilters}
              >
                Clear Filters
              </button>
            </div>

          ) : (

            <div className="hotspot-grid">

              {hotspots.map(
                (hotspot, index) => (

                  <div
                    className="hotspot-card"
                    key={`${hotspot.location}-${index}`}
                  >

                    <div className="hotspot-icon">
                      📍
                    </div>

                    <div className="hotspot-info">

                      <h3>
                        {hotspot.location}
                      </h3>

                      <p>
                        Risk:{" "}
                        {hotspot.risk}
                      </p>

                      <p>
                        Latitude:{" "}
                        {hotspot.latitude}
                      </p>

                      <p>
                        Longitude:{" "}
                        {hotspot.longitude}
                      </p>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </section>

        {/* =================================================
            ALERTS
        ================================================= */}

        <section className="panel alerts">

          <div className="panel-title">

            <div>

              <p className="eyebrow">
                LIVE INTELLIGENCE
              </p>

              <h2>
                Recent Alerts
              </h2>
              <button
                className="refresh-alerts-button"
                onClick={fetchAlerts}
                disabled={alertsLoading}
              >
                {alertsLoading
                    ? "Refreshing..."
                    : "↻ Refresh Alerts"}
              </button>

              <div className="alert-filters">

                {[
                  "ALL",
                  "NEW",
                  "ACKNOWLEDGED",
                  "RESOLVED",
                ].map((filter) => (

                  <button
                    key={filter}
                    className={
                      alertFilter === filter
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setAlertFilter(filter)
                    }
                  >
                    {filter}
                  </button>

                ))}

              </div>

            </div>

            <span className="alert-count">

              {filteredAlerts.length}{" "}

              {alertFilter === "ALL"
                ? "ACTIVE"
                : alertFilter}

            </span>

          </div>

          {alertsLoading ? (

            <div className="empty-state">
              Loading alerts...
            </div>

          ) : filteredAlerts.length === 0 ? (

            <div className="empty-state">
              No alerts found
            </div>

          ) : (

            <div className="alerts-list">

              {filteredAlerts.map(
                (alert) => {

                  const alertRisk =
                    String(
                      alert.risk || "LOW"
                    ).toLowerCase();

                  const alertStatus =
                    String(
                      alert.status || "NEW"
                    ).toUpperCase();

                  return (

                    <div
                      key={alert.alert_id}
                      className={`alert-card ${alertRisk}`}
                      onClick={() =>
                        setSelectedAlert(alert)
                      }
                    >

                      <div className="alert-header">

                        <strong>
                          {alert.alert_id}
                        </strong>

                        <span
                          className={`alert-risk ${alertRisk}`}
                        >
                          {alert.risk ||
                            "LOW"}
                        </span>

                      </div>

                      <h3>
                        {alert.location}
                      </h3>

                      <p>
                        {alert.message ||
                          "Cybercrime activity detected"}
                      </p>

                      <div className="alert-details">

                        <span>

                          Status:{" "}

                          <strong>
                            {alertStatus}
                          </strong>

                        </span>

                        {alert.hour !==
                          undefined && (

                          <span>
                            Hour:{" "}
                            {alert.hour}
                          </span>

                        )}

                      </div>

                      <div className="alert-actions">

                        {alertStatus ===
                          "NEW" && (

                          <button
                            onClick={(event) => {

                              event.stopPropagation();

                              updateAlertStatus(
                                alert.alert_id,
                                "ACKNOWLEDGED"
                              );

                            }}
                          >
                            Acknowledge
                          </button>

                        )}

                        {alertStatus ===
                          "ACKNOWLEDGED" && (

                          <button
                            className="alert-action resolve"
                            onClick={(event) => {

                              event.stopPropagation();

                              updateAlertStatus(
                                alert.alert_id,
                                "RESOLVED"
                              );

                            }}
                          >
                            Resolve
                          </button>

                        )}

                      </div>

                    </div>

                  );
                }
              )}

            </div>

          )}

        </section>

        {/* =================================================
            ALERT DETAIL MODAL
        ================================================= */}

        {selectedAlert && (

          <div
            className="alert-detail-overlay"
            onClick={() =>
              setSelectedAlert(null)
            }
          >

            <div
              className="alert-detail-panel"
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              <button
                className="close-alert"
                onClick={() =>
                  setSelectedAlert(null)
                }
              >
                ×
              </button>

              <p className="eyebrow">
                ALERT DETAILS
              </p>

              <h2>
                {selectedAlert.alert_id}
              </h2>

              <div className="alert-detail-risk">

                {selectedAlert.risk ||
                  "LOW"}{" "}
                RISK

              </div>

              <div className="alert-detail-info">

                <div>

                  <span>
                    Location
                  </span>

                  <strong>
                    {selectedAlert.location}
                  </strong>

                </div>

                <div>

                  <span>
                    Status
                  </span>

                  <strong>
                    {selectedAlert.status ||
                      "NEW"}
                  </strong>

                </div>

                {selectedAlert.hour !==
                  undefined && (

                  <div>

                    <span>
                      Hour
                    </span>

                    <strong>
                      {selectedAlert.hour}:00
                    </strong>

                  </div>

                )}

                {selectedAlert.complaints !==
                  undefined && (

                  <div>

                    <span>
                      Complaints
                    </span>

                    <strong>
                      {selectedAlert.complaints}
                    </strong>

                  </div>

                )}

                {selectedAlert.fraud_amount !==
                  undefined && (

                  <div>

                    <span>
                      Fraud Amount
                    </span>

                    <strong>

                      ₹
                      {Number(
                        selectedAlert.fraud_amount
                      ).toLocaleString(
                        "en-IN"
                      )}

                    </strong>

                  </div>

                )}

                {selectedAlert.suspicious_withdrawals !==
                  undefined && (

                  <div>

                    <span>
                      Suspicious Withdrawals
                    </span>

                    <strong>
                      {
                        selectedAlert.suspicious_withdrawals
                      }
                    </strong>

                  </div>

                )}

              </div>

              <p className="alert-detail-message">

                {selectedAlert.message ||
                  "Cybercrime activity detected."}

              </p>

            </div>

          </div>

        )}

        {/* =================================================
            RISK INTELLIGENCE MAP
        ================================================= */}

        <section className="dashboard-section">

          <div className="section-header">

            <div>

              <p className="eyebrow">
                GEOSPATIAL INTELLIGENCE
              </p>

              <h2>
                Risk Intelligence Map
              </h2>

              <p>
                Predicted cybercrime hotspots
                based on ML analysis
              </p>

            </div>

          </div>

          <RiskMap
            hotspots={hotspots}
          />

        </section>

        {/* =================================================
            ANALYTICS
        ================================================= */}

        <section className="analytics-grid">

          {/* RISK DISTRIBUTION */}

          <div className="panel analytics-panel">

            <div className="panel-title">

              <div>

                <p className="eyebrow">
                  ML DISTRIBUTION
                </p>

                <h2>
                  Risk Distribution
                </h2>

              </div>

            </div>

            <div className="chart-container">

              <ResponsiveContainer
                width="100%"
                height={280}
              >

                <BarChart
                  data={riskChartData}
                >

                  <XAxis
                    dataKey="name"
                  />

                  <YAxis
                    allowDecimals={false}
                  />

                  <Tooltip />

                  <Bar
                    dataKey="count"
                    radius={[
                      6,
                      6,
                      0,
                      0,
                    ]}
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>

          </div>

          {/* RISK SUMMARY */}

          <div className="panel analytics-panel">

            <div className="panel-title">

              <div>

                <p className="eyebrow">
                  INTELLIGENCE
                </p>

                <h2>
                  Risk Summary
                </h2>

              </div>

            </div>

            <div className="risk-summary">

              <div className="summary-item">

                <span>
                  HIGH RISK
                </span>

                <strong>
                  {highCount}
                </strong>

              </div>

              <div className="summary-item">

                <span>
                  MEDIUM RISK
                </span>

                <strong>
                  {mediumCount}
                </strong>

              </div>

              <div className="summary-item">

                <span>
                  LOW RISK
                </span>

                <strong>
                  {lowCount}
                </strong>

              </div>

              <div className="summary-item">

                <span>
                  TOTAL RECORDS
                </span>

                <strong>
                  {hotspots.length}
                </strong>

              </div>

            </div>

          </div>

        </section>

      </main>

    </div>
  );
}

// =====================================================
// MAP LEGEND
// =====================================================

function MapLegend() {
  return (
    <div className="map-legend">

      <strong>
        Risk Level
      </strong>

      <div className="legend-item">

        <span className="legend-dot high"></span>

        HIGH

      </div>

      <div className="legend-item">

        <span className="legend-dot medium"></span>

        MEDIUM

      </div>

      <div className="legend-item">

        <span className="legend-dot low"></span>

        LOW

      </div>

    </div>
  );
}

export default App;