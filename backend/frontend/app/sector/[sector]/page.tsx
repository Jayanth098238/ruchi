import SectorClient from './SectorClient';

export const dynamicParams = false;
export async function generateStaticParams() {
  const sectors = [
    'Technology',
    'Finance',
    'Healthcare',
    'Energy',
    'Retail',
    'Manufacturing',
    'Real Estate',
    'Transportation',
    'Media',
    'Education',
    'Other',
  ];
  return sectors.map((s) => ({ sector: s }));
}

export default async function Page({ params }: { params: Promise<{ sector: string }> }) {
  // Server component wrapper passes sector to client component
  const { sector } = await params;
  return <SectorClient sector={sector} />;
}