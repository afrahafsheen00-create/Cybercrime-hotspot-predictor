import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

function MapLegend() {
  return (
    <div className="map-legend">
      <strong>Risk Level</strong>

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

function RiskMap({ hotspots = [] }) {
  return (
    <div className="risk-map">

      <MapContainer
        center={[20.5937, 78.9629]}
        zoom={5}
        scrollWheelZoom={true}
        style={{
          height: "500px",
          width: "100%",
        }}
      >

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapLegend />

        {hotspots.map((spot, index) => {

          const risk = String(
            spot.risk || "LOW"
          ).toUpperCase();

          let fillColor = "#22c55e";

          if (risk === "HIGH") {
            fillColor = "#ef4444";
          }

          if (risk === "MEDIUM") {
            fillColor = "#f59e0b";
          }

          const latitude = Number(
            spot.latitude
          );

          const longitude = Number(
            spot.longitude
          );

          // Ignore invalid coordinates
          if (
            Number.isNaN(latitude) ||
            Number.isNaN(longitude)
          ) {
            return null;
          }

          return (
            <CircleMarker
              key={`${spot.location}-${index}`}
              center={[
                latitude,
                longitude,
              ]}
              radius={
                risk === "HIGH"
                  ? 14
                  : risk === "MEDIUM"
                  ? 11
                  : 8
              }
              pathOptions={{
                color: fillColor,
                fillColor: fillColor,
                fillOpacity: 0.75,
                weight: 2,
              }}
            >

              <Popup>

                <strong>
                  {spot.location}
                </strong>

                <br />

                Risk Level:{" "}
                <strong>
                  {risk}
                </strong>

                <br />

                Complaints:{" "}
                {spot.complaints ?? 0}

                <br />

                Fraud Amount: ₹
                {Number(
                  spot.fraud_amount || 0
                ).toLocaleString("en-IN")}

                <br />

                Suspicious Withdrawals:{" "}
                {spot.suspicious_withdrawals ?? 0}

                <br />

                Hour:{" "}
                {spot.hour ?? "--"}:00

              </Popup>

            </CircleMarker>
          );
        })}

      </MapContainer>

    </div>
  );
}

export default RiskMap;