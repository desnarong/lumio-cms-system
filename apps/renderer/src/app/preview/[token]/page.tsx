import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageView } from '../../../components/PageView';
import { loadPreviewOrNull } from '../../../lib/content';
import { requestHost } from '../../../lib/request-host';
import { buildMetadata } from '../../../seo';

/**
 * Draft preview reached from the editor's "ดูตัวอย่าง" button
 * (docs/design/10-architecture.md 10.4). The signed token in the URL is the only
 * credential, the page is never cached, and it is never indexed.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface PreviewPageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PreviewPageProps): Promise<Metadata> {
  const { token } = await params;
  const host = await requestHost();
  const page = await loadPreviewOrNull(token);
  if (!page) return { title: 'ลิงก์ตัวอย่างหมดอายุ', robots: { index: false, follow: false } };
  return {
    ...buildMetadata(page, host),
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { token } = await params;
  const host = await requestHost();
  const page = await loadPreviewOrNull(token);
  if (!page || !page.content) notFound();

  return (
    <>
      <p className="site-locale-notice" role="note">
        ตัวอย่างฉบับร่าง — หน้านี้ยังไม่เผยแพร่ ผู้เยี่ยมชมทั่วไปเปิดไม่ได้
      </p>
      <PageView page={page} host={host} preview />
    </>
  );
}
