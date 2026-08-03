export default function CompanyOverview({ ticker }) {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Company: {ticker}</h1>
      <p>Company overview information will be displayed here.</p>
    </div>
  );
}
