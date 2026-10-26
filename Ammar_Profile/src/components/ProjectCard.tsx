import { Link } from "react-router";
import { LockKeyhole } from "lucide-react";
import { useLocale } from "../lib/useLocale";
import type { Project } from "../data/projects";
import ProjectCover from "./ProjectCover";
import { DirectionArrow } from "./Icons";
export default function ProjectCard({
  project,
  featured = false,
}: {
  project: Project;
  featured?: boolean;
}) {
  const { text, lang } = useLocale();
  const copy = project.copy[lang];
  return (
    <article
      className={`project-card reveal ${featured ? "featured-card" : ""}`}
    >
      <Link
        to={`/${lang}/projects/${project.slug}`}
        className="cover-link"
        aria-label={`${text.details}: ${copy.title}`}
        tabIndex={-1}
        aria-hidden="true"
      >
        <ProjectCover project={project} large={featured} />
      </Link>
      <div className="project-card-body">
        <div className="project-kicker">
          <span>{copy.category}</span>
          <span className="project-number">/{project.number}</span>
        </div>
        <h3>
          <Link to={`/${lang}/projects/${project.slug}`}>
            {copy.title}
            <DirectionArrow />
          </Link>
        </h3>
        <p>{copy.summary}</p>
        <div className="tech-list">
          {project.technologies.slice(0, featured ? 5 : 3).map((tech) => (
            <bdi key={tech}>{tech}</bdi>
          ))}
        </div>
        <div className="project-card-foot">
          <span>{project.team ? text.team : text.individual}</span>
          {!project.publicRepo && (
            <span className="private-label">
              <LockKeyhole size={13} aria-hidden="true" />
              {text.privateRepo}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
