import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PageHeader({
  title,
  sub,
  actions,
  back,
  tags,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  tags?: React.ReactNode;
}) {
  return (
    <>
      {back && (
        <Link href={back.href} className="back-link">
          <ArrowLeft size={16} aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="page-head">
        <div className="page-head-text">
          <h1>
            {title}
            {tags && <span className="title-tags">{tags}</span>}
          </h1>
          {sub && <p className="page-sub">{sub}</p>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
    </>
  );
}
