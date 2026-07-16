import { useState, useCallback } from "react";

const BASE_URL = "http://localhost:3001/api";

function useApi() {
  const call = useCallback(
    async (path, method = "GET", body = null) => {
      const opts = {
        method,
        headers: { "Content-Type": "application/json" },
      };
      if (body) opts.body = JSON.stringify(body);
      let res;
      try {
        res = await fetch(`${BASE_URL}${path}`, opts);
      } catch (networkErr) {
        const err = new Error("Could not reach the proxy server. Make sure server.js is running on port 3001.");
        err.status = null;
        throw err;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const err = new Error(text || res.statusText);
        err.status = res.status;
        throw err;
      }
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    },
    []
  );
  return call;
}

function statusLabel(status) {
  if (status === 401) return "Invalid API key — check PB_API_KEY in your server environment.";
  if (status === 402) return "Insufficient credits on this account.";
  if (status === 403) return "This endpoint is not enabled for your account.";
  if (status === 404) return "No record found for this entity.";
  if (status === 409) return "Duplicate request detected — try again.";
  if (status === 429) return "Rate limit reached — wait a moment and retry.";
  if (status === 503) return "PitchBook API temporarily unavailable — try again shortly.";
  if (status === null) return "Could not reach the proxy server. Make sure server.js is running on port 3001.";
  return "An unexpected error occurred.";
}

function Badge({ children, color = "gray" }) {
  const map = {
    blue:  { bg: "#E6F1FB", color: "#0C447C", border: "#B5D4F4" },
    teal:  { bg: "#E1F5EE", color: "#085041", border: "#9FE1CB" },
    gray:  { bg: "#F1EFE8", color: "#444441", border: "#D3D1C7" },
    amber: { bg: "#FAEEDA", color: "#633806", border: "#FAC775" },
    coral: { bg: "#FAECE7", color: "#712B13", border: "#F5C4B3" },
  };
  const t = map[color] || map.gray;
  return (
    <span style={{ background: t.bg, color: t.color, border: `0.5px solid ${t.border}`, borderRadius: 6, fontSize: 12, padding: "2px 8px", whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" style={{ animation: "spin 0.8s linear infinite", display: "inline-block" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="9" cy="9" r="7" fill="none" stroke="var(--color-border-secondary)" strokeWidth="2" />
      <path d="M9 2 A7 7 0 0 1 16 9" fill="none" stroke="var(--color-text-info,#185FA5)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--color-text-tertiary)" }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
      <p style={{ margin: 0, fontWeight: 500, color: "var(--color-text-secondary)", fontSize: 14 }}>{title}</p>
      {sub && <p style={{ margin: "4px 0 0", fontSize: 13 }}>{sub}</p>}
    </div>
  );
}

function ErrorBanner({ message, status, raw }) {
  const [showRaw, setShowRaw] = useState(false);
  return (
    <div style={{ background: "var(--color-background-danger)", color: "var(--color-text-danger)", border: "0.5px solid var(--color-border-danger,#F09595)", borderRadius: "var(--border-radius-md)", padding: "10px 14px", fontSize: 13, marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {status != null && (
          <span style={{ background: "#F09595", color: "#501313", borderRadius: 4, fontSize: 11, fontWeight: 500, padding: "2px 7px", flexShrink: 0, letterSpacing: "0.03em", lineHeight: "18px" }}>
            {status}
          </span>
        )}
        <span style={{ flex: 1 }}>{message}</span>
        {raw && (
          <button
            onClick={() => setShowRaw(v => !v)}
            style={{ fontSize: 11, color: "var(--color-text-danger)", border: "0.5px solid var(--color-border-danger,#F09595)", background: "none", borderRadius: 4, padding: "2px 7px", cursor: "pointer", flexShrink: 0 }}
          >
            {showRaw ? "hide details" : "details"}
          </button>
        )}
      </div>
      {showRaw && raw && (
        <pre style={{ margin: "8px 0 0", fontSize: 11, whiteSpace: "pre-wrap", wordBreak: "break-all", opacity: 0.8, lineHeight: 1.5 }}>{raw}</pre>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "12px 16px", flex: 1, minWidth: 0 }}>
      <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
      <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)" }}>{value}</p>
    </div>
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const [selectedCompany, setSelectedCompany] = useState(null);
  const [deals, setDeals] = useState([]);
  const [lenderMap, setLenderMap] = useState({});
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [loadingLenders, setLoadingLenders] = useState(false);
  const [dealError, setDealError] = useState(null);

  const [expandedDeal, setExpandedDeal] = useState(null);
  const [creditNote, setCreditNote] = useState(null);

  const call = useApi();

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    setSearchResults([]);
    setSelectedCompany(null);
    setDeals([]);
    setLenderMap({});
    setCreditNote(null);
    try {
      const data = await call(`/search?query=${encodeURIComponent(query.trim())}&entityType=company&perPage=8`);
      const results = data?.results || data?.companies || data?.items || [];
      setSearchResults(results);
      if (results.length === 0) setSearchError({ message: "No companies found for that query.", status: null, raw: null });
    } catch (e) {
      setSearchError({ message: statusLabel(e.status), status: e.status, raw: e.message });
    } finally {
      setSearching(false);
    }
  };

  const handleSelectCompany = async (company) => {
    setSelectedCompany(company);
    setSearchResults([]);
    setDeals([]);
    setLenderMap({});
    setDealError(null);
    setExpandedDeal(null);
    setCreditNote(null);
    setLoadingDeals(true);
    try {
      const data = await call(`/companies/${company.id || company.pbId}/deals`);
      const dealList = data?.deals || data?.results || data?.items || [];
      setDeals(dealList);
      if (dealList.length > 0) {
        setCreditNote(`Fetching lender data will use up to ${dealList.length} credit${dealList.length !== 1 ? "s" : ""} (1 per deal).`);
        fetchAllLenders(dealList);
      }
    } catch (e) {
      setDealError({ message: statusLabel(e.status), status: e.status, raw: e.message });
    } finally {
      setLoadingDeals(false);
    }
  };

  const fetchAllLenders = async (dealList) => {
    setLoadingLenders(true);
    const results = {};
    await Promise.allSettled(
      dealList.map(async (deal) => {
        const dealId = deal.id || deal.dealId || deal.pbId;
        try {
          const data = await call(`/deals/${dealId}/debt-lenders`);
          results[dealId] = data?.lenders || data?.results || data?.items || [];
        } catch {
          results[dealId] = [];
        }
      })
    );
    setLenderMap(results);
    setLoadingLenders(false);
  };

  const totalLenders = Object.values(lenderMap).flat().length;
  const dealsWithLenders = Object.values(lenderMap).filter((arr) => arr.length > 0).length;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "1.5rem 1rem 3rem" }}>
      <h2 className="sr-only">PitchBook company lender lookup</h2>

      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ margin: "0 0 4px", fontWeight: 500, fontSize: 15, color: "var(--color-text-primary)" }}>Company lender lookup</p>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--color-text-secondary)" }}>
          Search for a company to see all their deals and the lenders involved.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            placeholder="Search company name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            style={{ flex: 1 }}
          />
          <button onClick={handleSearch} disabled={searching || !query.trim()}>
            {searching ? <Spinner /> : "Search"}
          </button>
        </div>
        {searchError && <ErrorBanner message={searchError.message} status={searchError.status} raw={searchError.raw} />}
      </div>

      {searchResults.length > 0 && (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden", marginBottom: "1.5rem" }}>
          {searchResults.map((r, i) => {
            const name = r.name || r.companyName || r.label || "—";
            const website = r.website || r.url || "";
            const id = r.id || r.pbId || r.companyId;
            return (
              <div
                key={id || i}
                onClick={() => handleSelectCompany({ ...r, id })}
                style={{ padding: "10px 14px", cursor: "pointer", borderBottom: i < searchResults.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-background-secondary)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{name}</span>
                <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>{website}</span>
              </div>
            );
          })}
        </div>
      )}

      {selectedCompany && (
        <>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: "1rem" }}>
            <p style={{ margin: 0, fontWeight: 500, fontSize: 16, color: "var(--color-text-primary)" }}>
              {selectedCompany.name || selectedCompany.companyName}
            </p>
            <Badge color="blue">{selectedCompany.id || selectedCompany.pbId}</Badge>
            <button
              onClick={() => { setSelectedCompany(null); setDeals([]); setLenderMap({}); setCreditNote(null); }}
              style={{ marginLeft: "auto", fontSize: 12, color: "var(--color-text-tertiary)", border: "none", background: "none", cursor: "pointer", padding: 0 }}
            >
              Clear ×
            </button>
          </div>

          {creditNote && !loadingLenders && (
            <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "0 0 1rem", lineHeight: 1.6 }}>
              <i className="ti ti-info-circle" aria-hidden="true" style={{ marginRight: 4, verticalAlign: -2 }} />
              {creditNote}
            </p>
          )}

          {loadingDeals ? (
            <div style={{ padding: "1.5rem 0", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 13 }}>
              <Spinner /> <span style={{ marginLeft: 8 }}>Loading deals…</span>
            </div>
          ) : dealError ? (
            <ErrorBanner message={dealError.message} status={dealError.status} raw={dealError.raw} />
          ) : deals.length === 0 ? (
            <EmptyState icon="📂" title="No deals found" sub="This company has no deal records in PitchBook." />
          ) : (
            <>
              <div style={{ display: "flex", gap: 10, marginBottom: "1rem" }}>
                <StatCard label="Deals" value={deals.length} />
                <StatCard label="Deals with lenders" value={loadingLenders ? "—" : dealsWithLenders} />
                <StatCard label="Total lender records" value={loadingLenders ? "—" : totalLenders} />
              </div>

              <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden" }}>
                {deals.map((deal, i) => {
                  const dealId = deal.id || deal.dealId || deal.pbId;
                  const dealName = deal.name || deal.dealName || deal.label || dealId;
                  const dealType = deal.dealType || deal.type || "";
                  const dealDate = deal.dealDate || deal.date || deal.closeDate || "";
                  const lenders = lenderMap[dealId] || [];
                  const isExpanded = expandedDeal === dealId;
                  const lendersFetched = dealId in lenderMap;

                  return (
                    <div key={dealId || i} style={{ borderBottom: i < deals.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
                      <div
                        onClick={() => setExpandedDeal(isExpanded ? null : dealId)}
                        style={{ padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-background-secondary)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <i className={`ti ti-chevron-${isExpanded ? "up" : "down"}`} aria-hidden="true" style={{ fontSize: 14, color: "var(--color-text-tertiary)", flexShrink: 0 }} />
                        <span style={{ fontWeight: 500, color: "var(--color-text-primary)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {dealName}
                        </span>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                          {dealType && <Badge color="gray">{dealType}</Badge>}
                          {dealDate && <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>{dealDate}</span>}
                          {loadingLenders && !lendersFetched ? (
                            <Spinner />
                          ) : lendersFetched ? (
                            <Badge color={lenders.length > 0 ? "teal" : "gray"}>
                              {lenders.length} lender{lenders.length !== 1 ? "s" : ""}
                            </Badge>
                          ) : null}
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ padding: "0 14px 14px 38px" }}>
                          {!lendersFetched && loadingLenders ? (
                            <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", margin: 0 }}>Loading lenders…</p>
                          ) : lenders.length === 0 ? (
                            <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", margin: 0 }}>No lender data available for this deal.</p>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {lenders.map((lender, li) => {
                                const lname = lender.name || lender.lenderName || lender.investorName || "—";
                                const role = lender.role || lender.lenderRole || "";
                                const amount = lender.amount || lender.commitmentAmount || "";
                                return (
                                  <div key={li} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 13 }}>
                                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#E6F1FB", color: "#0C447C", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 500, fontSize: 11, flexShrink: 0 }}>
                                      {lname.charAt(0).toUpperCase()}
                                    </div>
                                    <span style={{ fontWeight: 500, color: "var(--color-text-primary)", flex: 1 }}>{lname}</span>
                                    {role && <Badge color="blue">{role}</Badge>}
                                    {amount && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{amount}</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {!selectedCompany && searchResults.length === 0 && !searching && (
        <EmptyState icon="🔍" title="Search for a company above" sub="Results will appear here after you select a company." />
      )}
    </div>
  );
}
