import {
  ArrowUpRight,
  Asterisk,
  Boxes,
  GraduationCap,
  Leaf,
  ScanLine,
} from "lucide-react";
import type { Project } from "../data/projects";
import { useLocale } from "../lib/useLocale";
const icons = {
  store: Boxes,
  nexus: Asterisk,
  graduation: GraduationCap,
  trade: ScanLine,
  hsa: Leaf,
};
export default function ProjectCover({
  project,
  large = false,
}: {
  project: Project;
  large?: boolean;
}) {
  const { text, lang } = useLocale();
  const Icon = icons[project.cover as keyof typeof icons];
  return (
    <div
      className={`project-cover cover-${project.cover} ${large ? "cover-large" : ""}`}
      role="img"
      aria-label={`${text.cover}: ${project.copy[lang].title}. ${project.technologies.slice(0, 3).join(", ")}`}
    >
      <div className="cover-grid" aria-hidden="true" />
      <div className="cover-top" aria-hidden="true">
        <Icon size={29} strokeWidth={1.5} />
        <span>{project.number} / SELECTED WORK</span>
      </div>
      <div className="cover-title" dir="ltr" aria-hidden="true">
        {project.slug === "bs-store" ? (
          <>
            BS<span>Store.</span>
          </>
        ) : project.slug === "graduation" ? (
          <>
            Class of<span>2026.</span>
          </>
        ) : (
          <>
            {project.name}
            <span className="cover-dot">.</span>
          </>
        )}
      </div>
      <div className="cover-bottom" aria-hidden="true">
        <div>
          {project.copy[lang].coverLines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
        <ArrowUpRight size={28} strokeWidth={1.3} />
      </div>
      <div className="cover-arc" aria-hidden="true" />
    </div>
  );
}
